import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { signOut } from 'firebase/auth';

// Use REAL config/hooks
import { auth } from '@/firebase/config';
import ParentDashboardPage from '@/pages/parent/ParentDashboardPage';
import { PermissionProvider } from '@/hooks/usePermissions';
import { AuthProvider } from '@/contexts/AuthContext';
import LanguageContext from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { runParentDashboardTests, TestData } from './ParentDashboardPage.tests';

// Mock LanguageContext for UI simplicity
const mockLanguageContext = {
    t: (key: string, fallback: string) => fallback || key,
    language: 'en',
    setLanguage: () => { },
    dir: 'ltr',
    isRTL: false,
};

function parseHostAndPort(hostAndPort: string | undefined): { host: string; port: number } | undefined {
    if (hostAndPort == null) return undefined;
    const [host, portString] = hostAndPort.split(':');
    const port = Number(portString);
    return Number.isFinite(port) ? { host, port } : undefined;
}

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? 'test-project';
const FIRESTORE_RULES = readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

const hasFirestoreEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) || Boolean(process.env.FIREBASE_EMULATOR_HUB);
const describeWithFirestoreEmulator = hasFirestoreEmulator ? describe : describe.skip;

describeWithFirestoreEmulator('ParentDashboardPage (Integration)', () => {
    beforeAll(async () => {
        const emulator =
            parseHostAndPort(process.env.FIRESTORE_EMULATOR_HOST) ?? { host: '127.0.0.1', port: 8080 };

        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                host: emulator.host,
                port: emulator.port,
                rules: FIRESTORE_RULES,
            },
        });
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        if (auth.currentUser) await signOut(auth);
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    const setupIntegration = async (data?: TestData) => {
        if (!data) return;

        const userCredential = await import('firebase/auth').then(m => m.signInAnonymously(auth));
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();

            await db.collection('users').doc(uid).set({
                role: 'parent',
                email: 'john@example.com',
                displayName: 'John Smith'
            });

            for (const kid of data.kids) {
                await db.collection('kids').doc(kid.id).set({
                    ...kid,
                    parentInfo: {
                        ...kid.parentInfo,
                        parentIds: [uid]
                    }
                });
            }
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter>
                                <ParentDashboardPage />
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );
    };

    runParentDashboardTests(setupIntegration, {
        afterCommentSaved: async ({ kidId, comment }) => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const snap = await context.firestore().collection('kids').doc(kidId).get();
                expect(snap.data()?.comments?.parent).toBe(comment);
            });
        },
    });

    test('denies access for instructor role', async () => {
        await import('firebase/auth').then(m => m.signInAnonymously(auth));
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('Expected authenticated test user');

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection('users').doc(uid).set({
                role: 'instructor',
                email: 'instructor@test.com',
                displayName: 'Instructor User',
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter>
                                <ParentDashboardPage />
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        expect(
            await screen.findByText('Access denied: Parent credentials required')
        ).toBeInTheDocument();
    });

    test('allows access for secondary parent (in parentIds but not parentId)', async () => {
        const userCredential = await import('firebase/auth').then(m => m.signInAnonymously(auth));
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();

            await db.collection('users').doc(uid).set({
                role: 'parent',
                email: 'secondary@example.com',
                displayName: 'Secondary Parent'
            });

            await db.collection('kids').doc('shared-kid').set({
                participantNumber: '999',
                personalInfo: {
                    firstName: 'Shared',
                    lastName: 'Kid',
                    dateOfBirth: '2015-01-01',
                    address: '123 Shared St',
                    capabilities: 'None'
                },
                parentInfo: {
                    parentId: 'primary-parent-id',
                    parentIds: ['primary-parent-id', uid],
                    name: 'Primary Parent',
                    email: 'primary@example.com',
                    phone: '555-1111'
                },
                comments: { parent: '' },
                signedDeclaration: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter>
                                <ParentDashboardPage />
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        expect(await screen.findByText('Shared Kid')).toBeInTheDocument();
    });
});
