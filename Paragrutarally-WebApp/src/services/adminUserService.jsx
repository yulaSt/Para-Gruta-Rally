// src/services/adminUserService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export const DEFAULT_NEW_USER_PASSWORD = '123456';

const normalizeEmail = (email) => (
    typeof email === 'string' ? email.trim().toLowerCase() : ''
);

const withoutPassword = (userData) => {
    const { password: _password, ...profile } = userData;
    return profile;
};

/**
 * Create a new user without affecting the current admin session
 * @param {Object} userData - User data for creation
 * @param {Object} options - Creation options
 * @param {string} options.password - Optional password override
 * @returns {Promise<Object>} Creation result
 */
export const createUserAsAdmin = async (userData, options = {}) => {
    try {
        const createUser = httpsCallable(functions, 'createUserForAdmin');
        const normalizedEmail = normalizeEmail(userData.email);
        const password = options.password || userData.password || DEFAULT_NEW_USER_PASSWORD;
        const displayName = (userData.displayName || userData.name || '').trim();
        const profile = {
            ...withoutPassword(userData),
            email: normalizedEmail,
            displayName,
            authProvider: userData.authProvider || 'email'
        };

        const result = await createUser({
            email: normalizedEmail,
            password,
            displayName,
            profile
        });

        if (result.data.success) {
            return {
                success: true,
                uid: result.data.uid,
                password,
                repairedExistingAuthUser: result.data.repairedExistingAuthUser === true,
                message: result.data.repairedExistingAuthUser
                    ? 'Existing authentication account repaired successfully'
                    : 'User created successfully'
            };
        } else {
            throw new Error(result.data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error in createUserAsAdmin:', error);
        const errorCode = error?.code || '';
        const errorMessage = error?.message || '';

        // If Cloud Function is not available, provide clear error message
        if (errorMessage.includes('functions') || errorCode === 'functions/not-found') {
            throw new Error('Cloud Function not deployed. Please contact system administrator.');
        }

        // Handle specific Firebase errors
        if (
            errorCode === 'functions/already-exists' ||
            errorMessage.includes('email-already-exists') ||
            errorMessage.includes('email-already-in-use') ||
            errorMessage.includes('already registered')
        ) {
            throw new Error('This email is already registered');
        } else if (errorCode === 'functions/invalid-argument' && errorMessage.includes('email')) {
            throw new Error('Invalid email address');
        } else if (errorMessage.includes('invalid-email')) {
            throw new Error('Invalid email address');
        } else if (errorMessage.includes('weak-password')) {
            throw new Error('Password is too weak');
        } else {
            throw new Error(errorMessage || 'Failed to create user. Please try again.');
        }
    }
};
