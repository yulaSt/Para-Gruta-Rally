// src/services/formService.js - Updated Form Service
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp,
    writeBatch,
    Timestamp,
    increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';

// Collections
const FORMS_COLLECTION = 'forms';
const FORM_SUBMISSIONS_COLLECTION = 'form_submissions';
const STORAGE_DECLARATIONS_PATH = 'signedParentsDeclarations';

/**
 * Helper function to fetch user data by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data object
 */
const fetchUserData = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            // IMPORTANT: Use 'name' field ONLY, not displayName
            return {
                name: userData.name || `משתמש ${userId.slice(-4)}`,
                email: userData.email || '',
                phone: userData.phone || userData.phoneNumber || '',
                role: userData.role || 'parent'
            };
        } else {
            console.warn(`⚠️ User document not found: ${userId}`);
            return {
                name: `משתמש ${userId.slice(-4)}`,
                email: '',
                phone: '',
                role: 'unknown'
            };
        }
    } catch (error) {
        console.error(`❌ Error loading user ${userId}:`, error);
        return {
            name: `משתמש ${userId.slice(-4)}`,
            email: '',
            phone: '',
            role: 'unknown'
        };
    }
};

// ========================================
// FORM MANAGEMENT
// ========================================

/**
 * Get active forms for a specific user type
 * @param {string} userType - 'parent' or 'instructor'
 * @returns {Promise<Array>} List of active forms
 */
export const getActiveForms = async (userType) => {
    try {
        const formsRef = collection(db, FORMS_COLLECTION);
        // More lenient query for debugging
        const q = query(
            formsRef,
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const forms = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filter in JavaScript for better debugging
            if (data.targetUsers && data.targetUsers.includes(userType)) {
                forms.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    eventDetails: {
                        ...data.eventDetails,
                        eventDate: data.eventDetails?.eventDate
                    }
                });
            }
        });

        return forms;
    } catch (error) {
        console.error('❌ Error getting active forms:', error);
        throw error;
    }
};

/**
 * Get all forms with optional filtering (keeping existing function)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of forms
 */
export const getAllForms = async (options = {}) => {
    try {
        let formsQuery = collection(db, FORMS_COLLECTION);

        // Add filters
        if (options.status) {
            formsQuery = query(formsQuery, where('status', '==', options.status));
        }

        if (options.type) {
            formsQuery = query(formsQuery, where('type', '==', options.type));
        }

        // Add ordering
        formsQuery = query(formsQuery, orderBy('createdAt', 'desc'));

        // Add limit
        if (options.limit) {
            formsQuery = query(formsQuery, limit(options.limit));
        }

        const querySnapshot = await getDocs(formsQuery);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
        }));
    } catch (error) {
        console.error('❌ Error getting forms:', error);
        throw new Error(`Failed to get forms: ${error.message}`);
    }
};

/**
 * Get all forms for a specific role (backwards compatibility)
 * @param {string} role - 'parent' or 'instructor'
 * @returns {Promise<Array>} List of forms
 */
export const getFormsForRole = async (userRole, options = {}) => {
    try {
        let formsQuery = query(
            collection(db, FORMS_COLLECTION),
            where('targetUsers', 'array-contains', userRole),
            where('status', '==', 'active')
        );

        // Add ordering without dates to avoid timestamp issues
        formsQuery = query(formsQuery, orderBy('title', 'asc'));

        const querySnapshot = await getDocs(formsQuery);

        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Just return the data as-is, no date processing
            return {
                id: doc.id,
                ...data
            };
        });
    } catch (error) {
        console.error('❌ Error getting forms for role:', error);
        throw new Error(`Failed to get forms for role: ${error.message}`);
    }
};

/**
 * Get a specific form by ID
 * @param {string} formId - Form document ID
 * @returns {Promise<Object>} Form data
 */
export const getFormById = async (formId) => {
    try {
        const formRef = doc(db, FORMS_COLLECTION, formId);
        const formSnap = await getDoc(formRef);

        if (!formSnap.exists()) {
            throw new Error('Form not found');
        }

        const data = formSnap.data();

        // Helper function to safely convert dates
        const safeToDate = (timestamp) => {
            if (!timestamp) return null;
            if (timestamp instanceof Date) return timestamp;
            if (typeof timestamp === 'string') return new Date(timestamp);
            if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
            }
            // If it's already a timestamp object but toDate fails, return as-is
            return timestamp;
        };

        // Safely convert eventDate
        let eventDateConverted = null;
        if (data.eventDetails?.eventDate) {
            try {
                eventDateConverted = safeToDate(data.eventDetails.eventDate);
            } catch (e) {
                console.warn('Could not convert eventDate:', e);
                eventDateConverted = data.eventDetails.eventDate;
            }
        }

        return {
            id: formSnap.id,
            ...data,
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            eventDetails: data.eventDetails ? {
                ...data.eventDetails,
                eventDate: eventDateConverted
            } : undefined
        };
    } catch (error) {
        console.error('❌ Error getting form by ID:', error);
        throw error;
    }
};

/**
 * Get ALL form submissions with user details (for admin overview)
 * @returns {Promise<Array>} List of all submissions with user and form details
 */
export const getAllSubmissionsWithDetails = async () => {
    try {
        console.log('🔍 Getting all submissions with details');

        // Get all submissions
        const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);
        const querySnapshot = await getDocs(submissionsRef);

        const submissions = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            submissions.push({
                id: doc.id,
                ...data,
                submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : data.submittedAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
            });
        });

        console.log(`✅ Found ${submissions.length} total submissions`);

        // Get unique submitter IDs
        const submitterIds = [...new Set(submissions.map(s => s.submitterId).filter(Boolean))];
        console.log('👥 Loading user data for:', submitterIds.length, 'users');

        // Get unique form IDs
        const formIds = [...new Set(submissions.map(s => s.formId).filter(Boolean))];
        console.log('📋 Loading form data for:', formIds.length, 'forms');

        // Fetch user data using the helper function
        const userDataMap = {};
        await Promise.all(
            submitterIds.map(async (userId) => {
                userDataMap[userId] = await fetchUserData(userId);
                console.log(`✅ Loaded user ${userId}:`, userDataMap[userId].name);
            })
        );

        // Fetch form data
        const formDataMap = {};
        await Promise.all(
            formIds.map(async (formId) => {
                try {
                    const formData = await getFormById(formId);
                    formDataMap[formId] = {
                        title: formData.title || 'טופס לא ידוע',
                        type: formData.type || 'unknown'
                    };
                } catch (error) {
                    console.warn(`Could not load form ${formId}:`, error);
                    formDataMap[formId] = {
                        title: `טופס ${formId.slice(-4)}`,
                        type: 'unknown'
                    };
                }
            })
        );

        // Enrich submissions
        const enrichedSubmissions = submissions.map(submission => ({
            ...submission,
            submitterName: userDataMap[submission.submitterId]?.name || 'משתמש לא ידוע',
            submitterEmail: userDataMap[submission.submitterId]?.email || '',
            submitterPhone: userDataMap[submission.submitterId]?.phone || '',
            submitterRole: userDataMap[submission.submitterId]?.role || 'unknown',
            submitterData: userDataMap[submission.submitterId],
            formTitle: formDataMap[submission.formId]?.title || 'טופס לא ידוע',
            formType: formDataMap[submission.formId]?.type || 'unknown'
        }));

        // Sort by date
        enrichedSubmissions.sort((a, b) => {
            const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
            const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
            return dateB - dateA;
        });

        return enrichedSubmissions;

    } catch (error) {
        console.error('❌ Error getting all submissions with details:', error);
        throw error;
    }
};

/**
 * Get form submissions with user details for a specific form
 * @param {string} formId - Form ID to get submissions for
 * @returns {Promise<Array>} List of submissions with user details
 */
export const getFormSubmissionsWithUserDetails = async (formId) => {
    try {
        console.log('🔍 Getting submissions for form:', formId);

        // Get submissions for this form
        const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);
        const q = query(
            submissionsRef,
            where('formId', '==', formId)
        );

        const querySnapshot = await getDocs(q);
        const submissions = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            submissions.push({
                id: doc.id,
                ...data,
                submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : data.submittedAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
            });
        });

        console.log(`✅ Found ${submissions.length} submissions for form ${formId}`);

        // Get unique submitter IDs
        const submitterIds = [...new Set(submissions.map(s => s.submitterId).filter(Boolean))];
        console.log('👥 Loading user data for:', submitterIds);

        // Fetch user data using the helper function
        const userDataMap = {};
        await Promise.all(
            submitterIds.map(async (userId) => {
                userDataMap[userId] = await fetchUserData(userId);
                console.log(`✅ Loaded user ${userId}:`, userDataMap[userId].name);
            })
        );

        // Enrich submissions
        const enrichedSubmissions = submissions.map(submission => ({
            ...submission,
            submitterName: userDataMap[submission.submitterId]?.name || 'משתמש לא ידוע',
            submitterEmail: userDataMap[submission.submitterId]?.email || '',
            submitterPhone: userDataMap[submission.submitterId]?.phone || '',
            submitterRole: userDataMap[submission.submitterId]?.role || 'unknown',
            submitterData: userDataMap[submission.submitterId]
        }));

        // Sort by date
        enrichedSubmissions.sort((a, b) => {
            const dateA = a.submittedAt instanceof Date ? a.submittedAt : new Date(a.submittedAt);
            const dateB = b.submittedAt instanceof Date ? b.submittedAt : new Date(b.submittedAt);
            return dateB - dateA;
        });

        return enrichedSubmissions;

    } catch (error) {
        console.error('❌ Error getting submissions with user details:', error);
        throw error;
    }
};

/**
 * Increment form view count
 * @param {string} formId - Form document ID
 * @returns {Promise<void>}
 */
export const incrementFormViewCount = async (formId) => {
    try {
        const formRef = doc(db, FORMS_COLLECTION, formId);
        await updateDoc(formRef, {
            viewCount: increment(1),
            updatedAt: serverTimestamp()
        });

    } catch (error) {
        console.error('❌ Error incrementing view count:', error);
        throw error;
    }
};

/**
 * Create a new form
 * @param {Object} formData - Form data
 * @returns {Promise<string>} Created form ID
 */
export const createForm = async (formData) => {
    try {
        const formsRef = collection(db, FORMS_COLLECTION);
        const docRef = await addDoc(formsRef, {
            ...formData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            viewCount: 0,
            submissionCount: 0
        });

        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating form:', error);
        throw error;
    }
};

/**
 * Update an existing form
 * @param {string} formId - Form document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateForm = async (formId, updateData) => {
    try {
        const formRef = doc(db, FORMS_COLLECTION, formId);
        await updateDoc(formRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });

    } catch (error) {
        console.error('❌ Error updating form:', error);
        throw error;
    }
};

/**
 * Delete a form
 * @param {string} formId - Form document ID
 * @returns {Promise<void>}
 */
export const deleteForm = async (formId) => {
    try {
        // Best-effort cleanup: remove submissions belonging to this form.
        // This prevents dangling submissions from breaking admin views after deletion.
        try {
            const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);
            const q = query(submissionsRef, where('formId', '==', formId));
            const submissionsSnap = await getDocs(q);

            if (!submissionsSnap.empty) {
                const batch = writeBatch(db);
                submissionsSnap.forEach((submissionDoc) => {
                    batch.delete(submissionDoc.ref);
                });
                await batch.commit();
            }
        } catch (cleanupError) {
            console.warn('⚠️ Could not delete related submissions for form:', formId, cleanupError);
        }

        const formRef = doc(db, FORMS_COLLECTION, formId);
        await deleteDoc(formRef);

    } catch (error) {
        console.error('❌ Error deleting form:', error);
        throw error;
    }
};

// ========================================
// FORM SUBMISSIONS
// ========================================

/**
 * Create a new form submission
 * @param {Object} submissionData - Submission data
 * @returns {Promise<string>} Created submission ID
 */
export const createFormSubmission = async (submissionData) => {
    try {
        console.log('🔍 Attempting to create submission with data:', {
            ...submissionData,
            submitterId: submissionData.submitterId,
            formId: submissionData.formId,
            timestamp: new Date().toISOString()
        });

        const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);

        // Prepare data with server timestamps
        const dataToSubmit = {
            ...submissionData,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        console.log('📤 Data being submitted:', dataToSubmit);

        const docRef = await addDoc(submissionsRef, dataToSubmit);

        console.log('✅ Submission created successfully with ID:', docRef.id);

        // Increment form submission count
        if (submissionData.formId) {
            try {
                const formRef = doc(db, FORMS_COLLECTION, submissionData.formId);
                await updateDoc(formRef, {
                    submissionCount: increment(1),
                    updatedAt: serverTimestamp()
                });
            } catch (countError) {
                console.warn('⚠️ Could not increment form count:', countError);
                // Don't fail the submission if count update fails
            }
        }

        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating form submission:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Submission data that failed:', submissionData);
        throw error;
    }
};

/**
 * Get form submissions - basic version without user details
 * @param {string|Object} formIdOrFilters - Form ID or filter object
 * @returns {Promise<Array>} List of submissions
 */
export const getFormSubmissions = async (formIdOrFilters = null) => {
    try {
        const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);
        let q;

        // If no parameter, get all submissions
        if (!formIdOrFilters) {
            q = query(submissionsRef, orderBy('submittedAt', 'desc'));
        }
        // If it's a string, treat as formId
        else if (typeof formIdOrFilters === 'string') {
            q = query(
                submissionsRef,
                where('formId', '==', formIdOrFilters),
                orderBy('submittedAt', 'desc')
            );
        }
        // If it's an object, treat as filters
        else {
            const filters = formIdOrFilters;
            let queryConstraints = [];

            if (filters.formId) queryConstraints.push(where('formId', '==', filters.formId));
            if (filters.submitterId) queryConstraints.push(where('submitterId', '==', filters.submitterId));
            if (filters.formType) queryConstraints.push(where('formType', '==', filters.formType));
            if (filters.confirmationStatus) queryConstraints.push(where('confirmationStatus', '==', filters.confirmationStatus));

            queryConstraints.push(orderBy('submittedAt', 'desc'));
            q = query(submissionsRef, ...queryConstraints);
        }

        const querySnapshot = await getDocs(q);
        const submissions = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            submissions.push({
                id: doc.id,
                ...data,
                submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : data.submittedAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
            });
        });

        return submissions;
    } catch (error) {
        console.error('Error getting form submissions:', error);
        throw error;
    }
};

/**
 * Get user form assignments (backwards compatibility)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of assignments
 */
export const getUserFormAssignments = async (userId) => {
    // For now, return empty array as this might not be used in the new system
    return [];
};

/**
 * Update a form submission
 * @param {string} submissionId - Submission document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateFormSubmission = async (submissionId, updateData) => {
    try {

        const submissionRef = doc(db, FORM_SUBMISSIONS_COLLECTION, submissionId);

        // Prepare data with server timestamps
        const dataToUpdate = {
            ...updateData,
            updatedAt: serverTimestamp()
        };


        await updateDoc(submissionRef, dataToUpdate);

    } catch (error) {
        console.error('❌ Error updating form submission:', error);
        throw error;
    }
};

/**
 * Delete a form submission
 * @param {string} submissionId - Submission document ID
 * @returns {Promise<void>}
 */
export const deleteFormSubmission = async (submissionId) => {
    try {
        const submissionRef = doc(db, FORM_SUBMISSIONS_COLLECTION, submissionId);
        await deleteDoc(submissionRef);

    } catch (error) {
        console.error('❌ Error deleting form submission:', error);
        throw error;
    }
};

// ========================================
// FILE UPLOAD
// ========================================

/**
 * Upload declaration file to storage
 * @param {File} file - File to upload
 * @param {string} userId - User ID
 * @param {string} formId - Form ID
 * @returns {Promise<string>} Download URL
 */
export const uploadDeclarationFile = async (file, userId, formId) => {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userId}_${formId}_${Date.now()}.${fileExtension}`;
        const fileRef = ref(storage, `${STORAGE_DECLARATIONS_PATH}/${fileName}`);

        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        return downloadURL;
    } catch (error) {
        console.error('❌ Error uploading declaration file:', error);
        throw error;
    }
};

/**
 * Delete declaration file from storage
 * @param {string} fileUrl - File URL to delete
 * @returns {Promise<void>}
 */
export const deleteDeclarationFile = async (fileUrl) => {
    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
    } catch (error) {
        console.error('❌ Error deleting declaration file:', error);
        throw error;
    }
};

// ========================================
// ANALYTICS
// ========================================

/**
 * Get forms analytics
 * @returns {Promise<Object>} Analytics data
 */
export const getFormsAnalytics = async () => {
    try {
        const forms = await getAllForms();
        const submissions = await getFormSubmissions();

        return {
            totalForms: forms.length,
            activeForms: forms.filter(f => f.status === 'active').length,
            totalSubmissions: submissions.length,
            pendingSubmissions: submissions.filter(s => s.confirmationStatus === 'needs to decide').length
        };
    } catch (error) {
        console.error('❌ Error getting forms analytics:', error);
        throw error;
    }
};

/**
 * Get a user's submission for a specific form
 * @param {string} userId - User ID
 * @param {string} formId - Form ID
 * @returns {Promise<Object|null>} Submission data or null if not found
 */
export const getUserFormSubmission = async (userId, formId) => {
    try {
        const submissionsRef = collection(db, FORM_SUBMISSIONS_COLLECTION);
        const q = query(
            submissionsRef,
            where('submitterId', '==', userId),
            where('formId', '==', formId),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();

        return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : data.submittedAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
    } catch (error) {
        console.error('❌ Error getting user form submission:', error);
        throw error;
    }
};
