
import { describe, it, expect } from 'vitest';
import { validateUser, createEmptyUser, USER_ROLES } from '../../src/schemas/userSchema';

describe('userSchema', () => {
    const mockT = (key: any, defaultVal: any) => defaultVal || key;

    it('should allow empty displayName', () => {
        const user = createEmptyUser();
        user.name = 'Test User';
        user.email = 'test@example.com';
        user.phone = '0501234567';
        user.role = USER_ROLES.PARENT;
        // displayName is empty

        const result = validateUser(user, { isUpdate: false }, mockT) as any;
        expect(result.isValid).toBe(true);
    });


    it('should validate with displayName present', () => {
        const user = createEmptyUser();
        user.name = 'Test User';
        user.email = 'test@example.com';
        user.phone = '0501234567';
        user.role = USER_ROLES.PARENT;
        user.displayName = 'Test Display';

        const result = validateUser(user, { isUpdate: false }, mockT) as any;
        expect(result.isValid).toBe(true);
    });
});
