// src/services/adminUserService.js
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';

/**
 * Create a new user without affecting the current admin session
 * @param {Object} userData - User data for creation
 * @returns {Promise<Object>} Creation result
 */
export const createUserAsAdmin = async (userData) => {
    try {
        // First try using Cloud Function (recommended approach)
        const createUser = httpsCallable(functions, 'createUserForAdmin');

        const result = await createUser({
            email: userData.email,
            password: '123456', // Default password
            displayName: userData.displayName
        });

        if (result.data.success) {
            const uid = result.data.uid;
            const now = serverTimestamp();

            // Create user document in Firestore
            const normalizedEmail = userData.email.trim().toLowerCase();
            const userDoc = {
                createdAt: now,
                displayName: userData.displayName,
                email: normalizedEmail,
                emailLower: normalizedEmail,
                lastLogin: now,
                name: userData.name,
                phone: userData.phone,
                role: userData.role
            };

            await setDoc(doc(db, 'users', uid), userDoc);

            return {
                success: true,
                uid: uid,
                message: 'User created successfully'
            };
        } else {
            throw new Error(result.data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error in createUserAsAdmin:', error);

        // If Cloud Function is not available, provide clear error message
        if (error.message.includes('functions') || error.code === 'functions/not-found') {
            throw new Error('Cloud Function not deployed. Please contact system administrator.');
        }

        // Handle specific Firebase errors
        if (error.message.includes('email-already-exists') || error.message.includes('email-already-in-use')) {
            throw new Error('This email is already registered');
        } else if (error.message.includes('invalid-email')) {
            throw new Error('Invalid email address');
        } else if (error.message.includes('weak-password')) {
            throw new Error('Password is too weak');
        } else {
            throw new Error(error.message || 'Failed to create user. Please try again.');
        }
    }
};
