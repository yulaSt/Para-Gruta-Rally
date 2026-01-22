// src/schemas/userSchema.js
import { Timestamp } from 'firebase/firestore';

/**
 * User Schema Definition
 * Based on the Firestore structure and user management forms
 */

// Available user roles
export const USER_ROLES = {
    ADMIN: 'admin',
    INSTRUCTOR: 'instructor',
    PARENT: 'parent',
    HOST: 'host'
};

// Default/empty user object
export const createEmptyUser = () => ({
    // Basic identifiers
    displayName: '',
    email: '',
    name: '',
    phone: '',
    role: USER_ROLES.PARENT,

    // Authentication info
    authProvider: 'email',

    // Timestamps (auto-generated)
    createdAt: null,
    updatedAt: null,
    lastLogin: null
});

// Validation rules
export const userValidationRules = {
    required: [
        'email',
        'name',
        'phone',
        'role'
    ],

    email: [
        'email'
    ],

    phone: [
        'phone'
    ],

    roles: [
        'role'
    ],

    maxLength: {
        'displayName': 50,
        'email': 100,
        'name': 100,
        'phone': 20
    },

    minLength: {
        'displayName': 2,
        'name': 2,
        'phone': 10
    }
};

/**
 * Validate a user object against the schema
 * @param {Object} userData - The user data to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.isUpdate - Whether this is an update (skip email validation)
 * @param {function} t - Translation function
 * @returns {Object} - { isValid: boolean, errors: {} }
 */
export const validateUser = (userData, options = {}, t) => {
    const { isUpdate = false } = options;
    const errors = {};

    // Helper function to get nested value
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    // Check required fields
    userValidationRules.required.forEach(field => {
        // Skip email validation for updates since email cannot be changed
        if (isUpdate && field === 'email') {
            return;
        }

        const value = getNestedValue(userData, field);

        if (!value || (typeof value === 'string' && !value.trim())) {
            const fieldDisplayName = getFieldDisplayName(field, t);
            errors[field] = t('users.fieldRequired', '{field} is required', { field: fieldDisplayName });
        }
    });

    // Validate email format (only for creation, not updates)
    if (!isUpdate) {
        userValidationRules.email.forEach(field => {
            const value = getNestedValue(userData, field);
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                errors[field] = t('users.emailInvalid', 'Please enter a valid email address');
            }
        });
    }

    // Validate phone format (Israeli phone number - 10 digits)
    userValidationRules.phone.forEach(field => {
        const value = getNestedValue(userData, field);
        if (value) {
            // Remove all non-digits
            const digitsOnly = value.replace(/\D/g, '');

            if (digitsOnly.length === 0 && userValidationRules.required.includes(field)) {
                errors[field] = t('users.phoneRequired', 'Phone number is required');
            } else if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                errors[field] = t('users.phoneInvalid', 'Phone number must be exactly 10 digits');
            } else if (digitsOnly.length === 10 && !/^05[0-9]\d{7}$|^0[2-4,8-9]\d{7}$/.test(digitsOnly)) {
                errors[field] = t('users.phoneInvalidFormat', 'Please enter a valid Israeli phone number');
            }
        }
    });

    // Validate role
    userValidationRules.roles.forEach(field => {
        const value = getNestedValue(userData, field);
        const validRoles = Object.values(USER_ROLES);

        if (value && !validRoles.includes(value)) {
            errors[field] = t('users.roleInvalid', 'Please select a valid role');
        }
    });

    // Validate min lengths
    Object.entries(userValidationRules.minLength).forEach(([field, minLength]) => {
        const value = getNestedValue(userData, field);
        if (value && value.trim().length < minLength) {
            const fieldDisplayName = getFieldDisplayName(field, t);
            errors[field] = t('users.minLength', '{field} must be at least {min} characters', {
                field: fieldDisplayName,
                min: minLength
            });
        }
    });

    // Validate max lengths
    Object.entries(userValidationRules.maxLength).forEach(([field, maxLength]) => {
        const value = getNestedValue(userData, field);
        if (value && value.length > maxLength) {
            const fieldDisplayName = getFieldDisplayName(field, t);
            errors[field] = t('users.maxLength', '{field} must be {max} characters or less', {
                field: fieldDisplayName,
                max: maxLength
            });
        }
    });

    // Validate name fields with different rules
    // Display Name: Letters (Hebrew/English), numbers, spaces only
    if (userData.displayName) {
        const displayNameRegex = /^[\u0590-\u05FFa-zA-Z0-9\s]+$/;
        if (!displayNameRegex.test(userData.displayName.trim())) {
            errors.displayName = t('users.displayNameInvalidChars', 'Display name can only contain letters, numbers, and spaces');
        }
    }

    // Name (Full Name): Letters (Hebrew/English), spaces, hyphens, apostrophes only - NO numbers
    if (userData.name) {
        const nameRegex = /^[\u0590-\u05FFa-zA-Z\s'-]+$/;
        if (!nameRegex.test(userData.name.trim())) {
            errors.name = t('users.nameInvalidChars', 'Full name can only contain letters, spaces, hyphens, and apostrophes');
        }
    }

    const isValid = Object.keys(errors).length === 0;
    return {
        isValid,
        errors
    };
};

/**
 * Get field display name for error messages
 * @param {string} field - Field name
 * @param {function} t - Translation function
 * @returns {string} - Display name
 */
const getFieldDisplayName = (field, t) => {
    const fieldNames = {
        displayName: t('users.displayName', 'Display Name'),
        email: t('users.email', 'Email'),
        name: t('users.fullName', 'Full Name'),
        phone: t('users.phone', 'Phone'),
        role: t('users.role', 'Role')
    };

    return fieldNames[field] || field;
};

/**
 * Prepare user data for Firestore (add timestamps, clean up)
 * @param {Object} userData - The user data to prepare
 * @param {boolean} isUpdate - Whether this is an update (preserve createdAt)
 * @returns {Object} - Cleaned user data ready for Firestore
 */
export const prepareUserForFirestore = (userData, isUpdate = false) => {
    const cleanData = { ...userData };

    // Add/update timestamps
    if (!isUpdate) {
        cleanData.createdAt = Timestamp.now();
        cleanData.lastLogin = Timestamp.now();
    }
    cleanData.updatedAt = Timestamp.now();

    // Clean phone number (remove non-digits)
    if (cleanData.phone) {
        cleanData.phone = cleanData.phone.replace(/\D/g, '');
    }

    // Trim string fields
    const stringFields = ['displayName', 'email', 'name'];
    stringFields.forEach(field => {
        if (cleanData[field] && typeof cleanData[field] === 'string') {
            cleanData[field] = cleanData[field].trim();
        }
    });

    // Ensure email is lowercase
    if (cleanData.email) {
        cleanData.email = cleanData.email.toLowerCase();
    }

    // Clean up empty strings and null values
    const cleanObject = (obj) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
                const cleanedNested = cleanObject(value);
                if (Object.keys(cleanedNested).length > 0) {
                    cleaned[key] = cleanedNested;
                }
            } else if (value !== '') {
                cleaned[key] = value;
            }
        }
        return cleaned;
    };

    return cleanObject(cleanData);
};

/**
 * Convert Firestore document to user object
 * @param {Object} doc - Firestore document
 * @returns {Object} - User object with proper data types
 */
export const convertFirestoreToUser = (doc) => {
    const data = doc.data();
    const user = createEmptyUser();

    // Merge with default structure to ensure all fields exist
    const mergedData = {
        ...user,
        ...data,
        id: doc.id
    };

    // Convert Firestore Timestamps to Date objects for display
    if (mergedData.createdAt?.toDate) {
        mergedData.createdAt = mergedData.createdAt.toDate();
    }
    if (mergedData.updatedAt?.toDate) {
        mergedData.updatedAt = mergedData.updatedAt.toDate();
    }
    if (mergedData.lastLogin?.toDate) {
        mergedData.lastLogin = mergedData.lastLogin.toDate();
    }

    return mergedData;
};

/**
 * Get user's display name with fallback
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export const getUserDisplayName = (user) => {
    return user.displayName || user.name || user.email || 'Unknown User';
};

/**
 * Get role display info
 * @param {string} role - Role value
 * @param {function} t - Translation function
 * @returns {Object} - Role info with label and color
 */
export const getRoleInfo = (role, t) => {
    const roleInfo = {
        [USER_ROLES.ADMIN]: {
            label: t('users.admin', 'Admin'),
            color: '#DC2626',
            priority: 1
        },
        [USER_ROLES.INSTRUCTOR]: {
            label: t('users.instructor', 'Instructor'),
            color: '#059669',
            priority: 2
        },
        [USER_ROLES.HOST]: {
            label: t('users.host', 'Host'),
            color: '#7C3AED',
            priority: 3
        },
        [USER_ROLES.PARENT]: {
            label: t('users.parent', 'Parent'),
            color: '#2563EB',
            priority: 4
        }
    };

    return roleInfo[role] || {
        label: role || t('users.unknown', 'Unknown'),
        color: '#6B7280',
        priority: 999
    };
};

/**
 * Validate single field (for real-time validation)
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @param {Object} options - Validation options
 * @param {function} t - Translation function
 * @returns {string|null} - Error message or null if valid
 */
export const validateUserField = (fieldName, value, options = {}, t) => {
    const { isUpdate = false } = options;

    // Create a mock user object with just this field
    const mockUser = { [fieldName]: value };

    // Run full validation
    const validation = validateUser(mockUser, { isUpdate }, t);

    // Return error for this specific field
    return validation.errors[fieldName] || null;
};

/**
 * Clean phone number input (remove non-digits)
 * @param {string} phone - Phone number to clean
 * @returns {string} - Cleaned phone number
 */
export const cleanPhoneNumber = (phone) => {
    return phone ? phone.replace(/\D/g, '') : '';
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    const cleaned = cleanPhoneNumber(phone);
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return cleaned;
};

/**
 * Check if user has specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean} - True if user has role
 */
export const userHasRole = (user, role) => {
    return user?.role === role;
};

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean} - True if user is admin
 */
export const isUserAdmin = (user) => {
    return userHasRole(user, USER_ROLES.ADMIN);
};

// Export the schema for use in forms and validation
export default {
    USER_ROLES,
    createEmptyUser,
    validateUser,
    validateUserField,
    prepareUserForFirestore,
    convertFirestoreToUser,
    getUserDisplayName,
    getRoleInfo,
    cleanPhoneNumber,
    formatPhoneNumber,
    userHasRole,
    isUserAdmin,
    userValidationRules
};