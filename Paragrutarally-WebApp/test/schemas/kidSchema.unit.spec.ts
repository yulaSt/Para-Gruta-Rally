import { describe, test, expect } from 'vitest';
import {
    createEmptyKid,
    validateKid,
    prepareKidForFirestore
} from '@/schemas/kidSchema';

describe('kidSchema', () => {
    describe('createEmptyKid', () => {
        test('creates kid with secondParentInfo field', () => {
            const kid = createEmptyKid();
            expect(kid.secondParentInfo).toBeDefined();
            expect(kid.secondParentInfo).toEqual({
                name: '',
                email: '',
                phone: '',
                grandparentsInfo: {
                    names: '',
                    phone: ''
                }
            });
        });

        test('creates kid with parentInfo including parentIds array', () => {
            const kid = createEmptyKid();
            expect(kid.parentInfo).toBeDefined();
            expect(kid.parentInfo.parentIds).toEqual([]);
        });
    });

    describe('validateKid - secondParentInfo phone validation', () => {
        test('validates secondParentInfo.phone when provided', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.secondParentInfo = {
                name: 'Second Parent',
                email: 'second@test.com',
                phone: '123' // Invalid phone
            };

            const result = validateKid(kid);
            expect(result.isValid).toBe(false);
            expect(result.errors['secondParentInfo.phone']).toBeDefined();
        });

        test('accepts valid secondParentInfo.phone', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.secondParentInfo = {
                name: 'Second Parent',
                email: 'second@test.com',
                phone: '0521234567' // Valid phone
            };

            const result = validateKid(kid);
            expect(result.isValid).toBe(true);
            expect(result.errors['secondParentInfo.phone']).toBeUndefined();
        });

        test('allows empty secondParentInfo.phone', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.secondParentInfo = {
                name: 'Second Parent',
                email: 'second@test.com',
                phone: '' // Empty is OK
            };

            const result = validateKid(kid);
            expect(result.isValid).toBe(true);
        });
    });

    describe('prepareKidForFirestore', () => {
        test('preserves secondParentInfo when present', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.secondParentInfo = {
                name: 'Second Parent',
                email: 'second@test.com',
                phone: '0521234567'
            };

            const prepared = prepareKidForFirestore(kid);
            expect(prepared.secondParentInfo).toBeDefined();
            expect(prepared.secondParentInfo.name).toBe('Second Parent');
            expect(prepared.secondParentInfo.email).toBe('second@test.com');
            expect(prepared.secondParentInfo.phone).toBe('0521234567');
        });

        test('removes empty secondParentInfo fields', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            // secondParentInfo is empty by default

            const prepared = prepareKidForFirestore(kid);
            // Empty object should be cleaned up
            expect(prepared.secondParentInfo).toBeUndefined();
        });

        test('syncs parentIds when parentId is set', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.parentInfo.parentId = 'parent-123';
            kid.parentInfo.parentIds = [];

            const prepared = prepareKidForFirestore(kid);
            expect(prepared.parentInfo.parentIds).toContain('parent-123');
        });
    });

    describe('parentIds array handling', () => {
        test('validates kid with multiple parentIds', () => {
            const kid = createEmptyKid();
            kid.participantNumber = '001';
            kid.personalInfo.firstName = 'Test';
            kid.personalInfo.lastName = 'Kid';
            kid.personalInfo.dateOfBirth = '2015-01-01';
            kid.parentInfo.name = 'Parent';
            kid.parentInfo.email = 'parent@test.com';
            kid.parentInfo.phone = '0501234567';
            kid.parentInfo.parentIds = ['parent-1', 'parent-2'];

            const result = validateKid(kid);
            expect(result.isValid).toBe(true);
        });
    });
});
