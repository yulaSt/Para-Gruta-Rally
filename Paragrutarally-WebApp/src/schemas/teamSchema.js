// src/schemas/teamSchema.js - Updated with Vehicle Assignment Support
import { z } from 'zod';

export const teamSchema = z.object({
    // Basic team information
    name: z.string()
        .min(1, 'Team name is required')
        .max(100, 'Team name must be less than 100 characters')
        .trim(),

    // Team capacity
    maxCapacity: z.number()
        .min(1, 'Max capacity must be at least 1')
        .max(50, 'Max capacity cannot exceed 50')
        .default(15),

    description: z.string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional()
        .nullable()
        .or(z.literal('')), // Allow empty string

    // Team status (active/inactive)
    active: z.boolean()
        .default(true),

    // Team assignments
    instructorIds: z.array(z.string())
        .default([]),

    kidIds: z.array(z.string())
        .default([]),

    // Vehicle assignments (NEW: vehicles assigned to this team)
    vehicleIds: z.array(z.string())
        .default([]),

    // Team leader (optional - one of the instructors can be the leader)
    teamLeaderId: z.string()
        .optional()
        .nullable(),

    // Additional information
    notes: z.string()
        .max(500, 'Notes must be less than 500 characters')
        .optional()
        .nullable()
        .or(z.literal('')), // Allow empty string

    // Timestamps (handled by Firestore)
    createdAt: z.any().optional(),
    updatedAt: z.any().optional()
});

// Schema for creating new teams (excludes timestamps)
export const createTeamSchema = teamSchema.omit({
    createdAt: true,
    updatedAt: true
});

// Schema for updating teams (all fields optional except basic required ones)
export const updateTeamSchema = teamSchema.partial().extend({
    name: z.string()
        .min(1, 'Team name is required')
        .max(100, 'Team name must be less than 100 characters')
        .trim(),

    maxCapacity: z.number()
        .min(1, 'Max capacity must be at least 1')
        .max(50, 'Max capacity cannot exceed 50')
});

// Function to create empty team with defaults
export const createEmptyTeam = () => {
    return {
        name: '',
        maxCapacity: 15,
        description: '',
        active: true,
        instructorIds: [],
        kidIds: [],
        vehicleIds: [], // NEW: Empty array for vehicle assignments
        teamLeaderId: '',
        notes: ''
    };
};

// Function to validate team data
export const validateTeam = (data, isUpdate = false) => {
    try {
        const schema = isUpdate ? updateTeamSchema : createTeamSchema;
        const validatedData = schema.parse(data);

        // Additional custom validations
        const errors = {};

        // Check if team has more kids than max capacity
        if (validatedData.kidIds && validatedData.kidIds.length > validatedData.maxCapacity) {
            errors.kidIds = `Cannot assign more kids (${validatedData.kidIds.length}) than max capacity (${validatedData.maxCapacity})`;
        }

        // Validate team leader is one of the instructors (if specified)
        if (validatedData.teamLeaderId &&
            validatedData.instructorIds &&
            !validatedData.instructorIds.includes(validatedData.teamLeaderId)) {
            errors.teamLeaderId = 'Team leader must be one of the assigned instructors';
        }

        // Validate at most one instructor is assigned to the team
        if (validatedData.instructorIds && validatedData.instructorIds.length > 1) {
            errors.instructorIds = 'A team can have at most one instructor';
        }

        if (Object.keys(errors).length > 0) {
            return {
                isValid: false,
                data: null,
                errors: errors
            };
        }

        return {
            isValid: true,
            data: validatedData,
            errors: null
        };
    } catch (error) {
        const formattedErrors = {};
        error.errors?.forEach(err => {
            const field = err.path[0];
            formattedErrors[field] = err.message;
        });

        return {
            isValid: false,
            data: null,
            errors: formattedErrors
        };
    }
};

// Function to format validation errors for display
export const formatTeamValidationErrors = (errors) => {
    const formattedErrors = {};

    if (Array.isArray(errors)) {
        errors.forEach(error => {
            const field = error.path[0];
            formattedErrors[field] = error.message;
        });
    } else {
        // Handle custom validation errors
        Object.keys(errors).forEach(field => {
            formattedErrors[field] = errors[field];
        });
    }

    return formattedErrors;
};

// Function to check team name uniqueness
export const checkTeamNameUniqueness = async (teamName, excludeTeamId = null) => {
    try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const normalizedName = teamName.trim();

        let teamsQuery = query(
            collection(db, 'teams'),
            where('name', '==', normalizedName)
        );

        const querySnapshot = await getDocs(teamsQuery);

        // If we're updating a team, exclude it from the check
        if (excludeTeamId) {
            const existingTeams = querySnapshot.docs.filter(doc => doc.id !== excludeTeamId);
            return existingTeams.length === 0;
        }

        return querySnapshot.empty;
    } catch (error) {
        console.error('Error checking team name uniqueness:', error);
        throw new Error('Failed to validate team name uniqueness');
    }
};

// Function to validate team capacity against current assignments
export const validateTeamCapacity = (maxCapacity, currentKidIds = []) => {
    if (currentKidIds.length > maxCapacity) {
        return {
            isValid: false,
            message: `Cannot reduce capacity to ${maxCapacity}. Currently has ${currentKidIds.length} kids assigned.`
        };
    }
    return {
        isValid: true,
        message: 'Capacity is valid'
    };
};