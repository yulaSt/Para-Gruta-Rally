import { afterAll, beforeAll, beforeEach, describe, expect } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { signOut } from 'firebase/auth';

// Use REAL config/hooks
import { auth } from '@/firebase/config';
import InstructorFormsPage from '@/pages/instructor/InstructorFormsPage';
import { PermissionProvider } from '@/hooks/usePermissions';
import { AuthProvider } from '@/contexts/AuthContext';
import LanguageContext from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { runInstructorFormsPageTests, TestData } from './InstructorFormsPage.tests';

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

describeWithFirestoreEmulator('InstructorFormsPage (Integration)', () => {
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

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();

            // Seed Forms
            for (const form of data.forms) {
                await db.collection('forms').doc(form.id).set(form);
            }

            // Seed Submissions
            for (const submission of data.submissions) {
                await db.collection('form_submissions').doc(submission.id).set(submission);
            }
        });

        // Authenticate as Instructor
        const userCredential = await import('firebase/auth').then(m => m.signInAnonymously(auth));
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection('users').doc(uid).set({
                role: 'instructor',
                email: 'instructor@test.com',
                displayName: 'Instructor User'
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter>
                                <InstructorFormsPage />
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );
    };

    runInstructorFormsPageTests(setupIntegration, {
        afterViewIncremented: async (formId) => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const snap = await context.firestore().collection('forms').doc(formId).get();
                // Assuming the test starts with viewCount >= 0, check it incremented
                expect(snap.data()?.viewCount).toBeGreaterThan(10);
            });
        }
    });

});
