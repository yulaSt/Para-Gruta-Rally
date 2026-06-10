// functions/index.js - Callable Functions (2nd Gen)
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Set global options for 2nd gen functions
setGlobalOptions({
    maxInstances: 10,
    region: 'us-central1'
});

// Initialize Firebase Admin SDK
initializeApp();

const auth = getAuth();
const firestore = getFirestore();
const usersCollection = firestore.collection('users');

const APP_ROLES = new Set(['admin', 'instructor', 'parent', 'host']);

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function findUserProfileByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const candidateQueries = [
        usersCollection.where('emailLower', '==', normalizedEmail).limit(1),
        usersCollection.where('email', '==', normalizedEmail).limit(1),
        usersCollection.where('email', '==', email.trim()).limit(1)
    ];

    for (const candidateQuery of candidateQueries) {
        const snapshot = await candidateQuery.get();
        if (!snapshot.empty) {
            return snapshot.docs[0];
        }
    }

    return null;
}

function normalizeRole(role) {
    const normalizedRole = typeof role === 'string' ? role.trim() : '';
    return APP_ROLES.has(normalizedRole) ? normalizedRole : null;
}

function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanPhone(value) {
    return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function buildAdminCreatedUserProfile({ email, displayName, profile, role }) {
    const now = FieldValue.serverTimestamp();
    const safeDisplayName = cleanString(profile.displayName) || displayName;
    const safeName = cleanString(profile.name);
    const safePhone = cleanPhone(profile.phone);
    const safeLocation = cleanString(profile.location);
    const authProvider = cleanString(profile.authProvider) || 'email';

    return {
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
        displayName: safeDisplayName,
        email,
        emailLower: email,
        name: safeName,
        phone: safePhone,
        role,
        authProvider,
        ...(safeLocation ? { location: safeLocation } : {})
    };
}

function publicProfileFromDoc(doc, data) {
    return {
        id: doc.id,
        displayName: data.displayName || '',
        email: data.email || '',
        name: data.name || '',
        phone: data.phone || '',
        role: data.role
    };
}

/**
 * Sync role stored in Firestore `users/{uid}.role` into an Auth custom claim `role`.
 * Storage rules rely on `request.auth.token.role`.
 */
export const syncUserRoleClaim = onDocumentWritten('users/{userId}', async (event) => {
    const { userId } = event.params;
    const after = event.data?.after;
    const role = after?.exists ? after.data()?.role : null;

    const allowedRoles = new Set(['admin', 'staff', 'instructor', 'parent', 'host', 'guest']);
    const normalizedRole = typeof role === 'string' && allowedRoles.has(role) ? role : null;

    try {
        const userRecord = await auth.getUser(userId);
        const existingClaims = userRecord.customClaims || {};
        const nextClaims = { ...existingClaims };

        if (normalizedRole == null) {
            delete nextClaims.role;
        } else {
            nextClaims.role = normalizedRole;
        }

        await auth.setCustomUserClaims(userId, nextClaims);
    } catch (error) {
        if (error?.code === 'auth/user-not-found') {
            return;
        }
        console.error('Failed to sync custom role claim:', { userId, error: error?.message || error });
        throw error;
    }
});

/**
 * Finalize Google sign-in after Firebase Auth has created/reused the account.
 * Unknown emails are removed from Auth so they do not become invisible orphan users.
 */
export const completeGoogleSignIn = onCall(
    {
        timeoutSeconds: 60,
        memory: '256MiB'
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                'unauthenticated',
                'User must be authenticated.'
            );
        }

        const userId = request.auth.uid;
        const authUser = await auth.getUser(userId);
        const normalizedEmail = normalizeEmail(authUser.email);

        // Only a verified Google identity may be linked to an existing profile by
        // email. Without this guard, anyone who can self-register an Auth account
        // with an arbitrary (unverified) email could claim another user's profile
        // and role (privilege escalation / account takeover).
        const isGoogleProvider = authUser.providerData.some(
            (provider) => provider.providerId === 'google.com'
        );
        if (!isGoogleProvider || !authUser.emailVerified) {
            throw new HttpsError(
                'permission-denied',
                'A verified Google sign-in is required to access this application.'
            );
        }

        if (!normalizedEmail) {
            await auth.deleteUser(userId);
            throw new HttpsError(
                'permission-denied',
                'This account has no email address. Please contact an administrator.'
            );
        }

        const userRef = usersCollection.doc(userId);
        let userDoc = await userRef.get();
        let userData = userDoc.exists ? userDoc.data() : null;
        let sourceUserDocId = null;

        if (!userDoc.exists) {
            const emailMatchedDoc = await findUserProfileByEmail(authUser.email);

            if (!emailMatchedDoc) {
                await auth.deleteUser(userId);
                throw new HttpsError(
                    'permission-denied',
                    'This email is not authorized to access this application. Please contact an administrator.'
                );
            }

            sourceUserDocId = emailMatchedDoc.id;
            userData = emailMatchedDoc.data();
            userDoc = emailMatchedDoc;
        }

        const role = normalizeRole(userData?.role);
        if (!role) {
            throw new HttpsError(
                'failed-precondition',
                'User profile is missing a valid role. Please contact an administrator.'
            );
        }

        const profileUpdate = {
            ...userData,
            email: normalizedEmail,
            emailLower: normalizedEmail,
            role,
            authProvider: 'google',
            lastLogin: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(authUser.displayName ? { displayName: authUser.displayName } : {}),
            ...(authUser.photoURL ? { photoURL: authUser.photoURL } : {})
        };

        if (userDoc.id !== userId) {
            await userRef.set({
                ...profileUpdate,
                linkedFromUserId: sourceUserDocId
            });
        } else {
            await userRef.set(profileUpdate, { merge: true });
        }

        const existingClaims = authUser.customClaims || {};
        await auth.setCustomUserClaims(userId, {
            ...existingClaims,
            role
        });

        return {
            success: true,
            user: publicProfileFromDoc({ id: userId }, profileUpdate)
        };
    }
);

/**
 * Callable Cloud Function to create an Auth user without switching the admin's session.
 */
export const createUserForAdmin = onCall(
    {
        timeoutSeconds: 60,
        memory: '256MiB'
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                'unauthenticated',
                'User must be authenticated to create users.'
            );
        }

        const callingUserDoc = await usersCollection.doc(request.auth.uid).get();
        if (!callingUserDoc.exists || callingUserDoc.data().role !== 'admin') {
            throw new HttpsError(
                'permission-denied',
                'Only admin users can create users.'
            );
        }

        const email = normalizeEmail(request.data?.email);
        const password = request.data?.password;
        const displayName = cleanString(request.data?.displayName);
        const profile = request.data?.profile && typeof request.data.profile === 'object'
            ? request.data.profile
            : null;
        const role = normalizeRole(profile?.role ?? request.data?.role);

        if (!email || typeof password !== 'string' || password.length < 6) {
            throw new HttpsError(
                'invalid-argument',
                'A valid email and password are required.'
            );
        }

        if (!profile || !role) {
            throw new HttpsError(
                'invalid-argument',
                'A valid user profile with role is required.'
            );
        }

        const emailMatchedDoc = await findUserProfileByEmail(email);
        if (emailMatchedDoc) {
            throw new HttpsError(
                'already-exists',
                'This email is already registered.'
            );
        }

        let userRecord;
        let createdAuthUser = false;
        let reusedExistingAuthUser = false;

        try {
            userRecord = await auth.createUser({
                email,
                password,
                displayName,
                emailVerified: false
            });
            createdAuthUser = true;
        } catch (error) {
            if (error?.code !== 'auth/email-already-exists') {
                if (error?.code === 'auth/invalid-email') {
                    throw new HttpsError('invalid-argument', 'Invalid email address.');
                }
                if (error?.code === 'auth/invalid-password') {
                    throw new HttpsError('invalid-argument', 'Password is too weak.');
                }
                throw error;
            }

            userRecord = await auth.getUserByEmail(email);
            const existingUserDoc = await usersCollection.doc(userRecord.uid).get();
            if (existingUserDoc.exists) {
                throw new HttpsError(
                    'already-exists',
                    'This email is already registered.'
                );
            }

            await auth.updateUser(userRecord.uid, {
                password,
                ...(displayName ? { displayName } : {})
            });
            reusedExistingAuthUser = true;
        }

        const userProfile = buildAdminCreatedUserProfile({
            email,
            displayName,
            profile,
            role
        });

        try {
            await usersCollection.doc(userRecord.uid).set(userProfile);
            await auth.setCustomUserClaims(userRecord.uid, {
                ...(userRecord.customClaims || {}),
                role
            });
        } catch (error) {
            if (createdAuthUser) {
                try {
                    await auth.deleteUser(userRecord.uid);
                } catch (deleteError) {
                    console.warn('Failed to roll back auth user after profile creation error:', {
                        uid: userRecord.uid,
                        error: deleteError?.message || deleteError
                    });
                }
            }
            console.error('Failed to create admin user profile:', {
                uid: userRecord.uid,
                email,
                error: error?.message || error
            });
            throw new HttpsError(
                'internal',
                'Failed to create user profile.'
            );
        }

        return {
            success: true,
            uid: userRecord.uid,
            repairedExistingAuthUser: reusedExistingAuthUser
        };
    }
);

/**
 * Callable Cloud Function to delete a user (Admin only)
 * This automatically handles CORS and authentication
 */
export const deleteUser = onCall(
    {
        timeoutSeconds: 540,
        memory: '1GiB',
        maxInstances: 5
    },
    async (request) => {
        try {

            // Check if user is authenticated
            if (!request.auth) {
                throw new HttpsError(
                    'unauthenticated',
                    'User must be authenticated to delete users.'
                );
            }

            const callingUserId = request.auth.uid;

            // Check if the calling user is an admin
            const callingUserDoc = await firestore
                .collection('users')
                .doc(callingUserId)
                .get();

            if (!callingUserDoc.exists) {
                throw new HttpsError(
                    'permission-denied',
                    'User profile not found. Please contact support.'
                );
            }

            const callingUserData = callingUserDoc.data();

            if (callingUserData.role !== 'admin') {
                throw new HttpsError(
                    'permission-denied',
                    'Only admin users can delete other users.'
                );
            }


            // Get the user ID to delete
            const { userIdToDelete } = request.data;

            if (!userIdToDelete) {
                throw new HttpsError(
                    'invalid-argument',
                    'Missing userIdToDelete parameter.'
                );
            }

            // Validate user ID format
            if (typeof userIdToDelete !== 'string' || userIdToDelete.length < 10) {
                throw new HttpsError(
                    'invalid-argument',
                    'Invalid user ID format.'
                );
            }

            // Prevent admin from deleting themselves
            if (userIdToDelete === callingUserId) {
                throw new HttpsError(
                    'invalid-argument',
                    'Cannot delete your own account. Please have another admin delete your account.'
                );
            }


            // Get user data before deletion for logging
            let userToDeleteData = null;
            try {
                const userToDeleteDoc = await firestore
                    .collection('users')
                    .doc(userIdToDelete)
                    .get();

                if (userToDeleteDoc.exists) {
                    userToDeleteData = userToDeleteDoc.data();
                }
            } catch (error) {
            }

            // Delete user from Firebase Authentication
            try {
                await auth.deleteUser(userIdToDelete);
            } catch (authError) {

                // If user doesn't exist in auth, that's okay
                if (authError.code === 'auth/user-not-found') {
                } else {
                    console.error(`❌ Failed to delete auth user ${userIdToDelete}:`, authError.message);
                    throw new HttpsError(
                        'internal',
                        `Failed to delete authentication account: ${authError.message}`
                    );
                }
            }



            // Return success
            return {
                success: true,
                message: 'User authentication account deleted successfully.',
                deletedUserId: userIdToDelete,
                deletedUserEmail: userToDeleteData?.email || null
            };

        } catch (error) {
            console.error('💥 Unexpected error in deleteUser function:', error);

            // If it's already a HttpsError, re-throw it
            if (error instanceof HttpsError) {
                throw error;
            }

            // Otherwise, wrap it in a generic HttpsError
            throw new HttpsError(
                'internal',
                'An unexpected error occurred while deleting the user.'
            );
        }
    }
);

/**
 * Callable function to get user information (Admin only)
 */
export const getUserInfo = onCall(
    {
        timeoutSeconds: 540,
        memory: '1GiB'
    },
    async (request) => {
        try {
            // Check authentication
            if (!request.auth) {
                throw new HttpsError(
                    'unauthenticated',
                    'User must be authenticated.'
                );
            }

            const callingUserId = request.auth.uid;

            // Check if calling user is admin
            const callingUserDoc = await firestore
                .collection('users')
                .doc(callingUserId)
                .get();

            if (!callingUserDoc.exists || callingUserDoc.data().role !== 'admin') {
                throw new HttpsError(
                    'permission-denied',
                    'Admin access required.'
                );
            }

            const { userId } = request.data;
            if (!userId) {
                throw new HttpsError(
                    'invalid-argument',
                    'Missing userId parameter.'
                );
            }

            // Get user info from Auth and Firestore
            const authUser = await auth.getUser(userId);
            const userDoc = await firestore.collection('users').doc(userId).get();

            return {
                success: true,
                authUser: {
                    uid: authUser.uid,
                    email: authUser.email,
                    emailVerified: authUser.emailVerified,
                    disabled: authUser.disabled,
                    creationTime: authUser.metadata.creationTime,
                    lastSignInTime: authUser.metadata.lastSignInTime
                },
                firestoreUser: userDoc.exists ? userDoc.data() : null
            };

        } catch (error) {
            console.error('Error in getUserInfo function:', error);

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                'internal',
                'Failed to get user information.'
            );
        }
    }
);

/**
 * Simple health check callable function
 */
export const healthCheck = onCall(
    {
        timeoutSeconds: 60,
        memory: '256MiB'
    },
    async (request) => {
        return {
            success: true,
            message: 'Admin callable functions are running correctly.',
            timestamp: new Date().toISOString(),
            authenticated: !!request.auth,
            userId: request.auth?.uid || null
        };
    }
);
