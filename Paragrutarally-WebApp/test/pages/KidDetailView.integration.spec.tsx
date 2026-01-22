import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { signOut } from 'firebase/auth';

import { auth } from '@/firebase/config';
import KidDetailView from '@/components/kids/KidDetail.jsx';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LanguageContext from '@/contexts/LanguageContext';
import { PermissionProvider } from '@/hooks/usePermissions';

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

describeWithFirestoreEmulator('KidDetailView (Integration)', () => {
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

    test('renders kid gender from personal info', async () => {
        const kidId = 'kid-1';

        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();

            await db.collection('users').doc(uid).set({
                role: 'admin',
                email: 'admin@test.com',
                displayName: 'Admin User',
                createdAt: new Date(),
            });

            await db.collection('kids').doc(kidId).set({
                participantNumber: '001',
                personalInfo: {
                    firstName: 'Kid',
                    lastName: 'Gender',
                    dateOfBirth: '2015-01-01',
                    gender: 'girl'
                },
                parentInfo: {
                    name: 'Parent One'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={[`/kid/${kidId}`]}>
                                <Routes>
                                    <Route path="/kid/:kidId" element={<KidDetailView />} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        await screen.findByRole('heading', { name: /Kid Gender/i }, { timeout: 15000 });

        expect(screen.getByText('Gender')).toBeInTheDocument();
        expect(screen.getByText('Girl')).toBeInTheDocument();
    });
});
