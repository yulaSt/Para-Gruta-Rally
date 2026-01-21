import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import CreateUserModal from '@/components/modals/CreateUserModal';
import { USER_ROLES } from '@/schemas/userSchema';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, connectAuthEmulator } from 'firebase/auth';
import { doc, getDoc, connectFirestoreEmulator, query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import LanguageContext from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';


// Mock firebase/auth specifically for createUserWithEmailAndPassword
vi.mock('firebase/auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('firebase/auth')>();
    return {
        ...actual,
        createUserWithEmailAndPassword: vi.fn(async (authInstance, email, password) => {
            // Check if this is the test user creation (starts with test-)
            if (typeof email === 'string' && email.startsWith('test-')) {
                return {
                    user: {
                        uid: 'mock-uid-' + Date.now(),
                        email: email
                    }
                };
            }
            // Otherwise use real implementation (for admin setup)
            return actual.createUserWithEmailAndPassword(authInstance, email, password);
        })
    };
});

// Mock LanguageContext
const mockLanguageContext = {
    t: (key: string, fallback: string) => fallback || key,
    language: 'en',
    setLanguage: () => { },
    dir: 'ltr',
    isRTL: false,
    currentLanguage: 'en'
};

function parseHostAndPort(hostAndPort: string | undefined): { host: string; port: number } | undefined {
    if (hostAndPort == null) return undefined;
    const [host, portString] = hostAndPort.split(':');
    const port = Number(portString);
    return Number.isFinite(port) ? { host, port } : undefined;
}

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? 'test-project';
// We might not need rules for this specific test if we use admin SDK or disable rules, 
// but it's good practice to initialize properly.
const FIRESTORE_RULES = readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8');

const hasFirestoreEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) || Boolean(process.env.FIREBASE_EMULATOR_HUB);
const describeWithFirestoreEmulator = hasFirestoreEmulator ? describe : describe.skip;

describeWithFirestoreEmulator('CreateUserModal Integration', () => {
    const onClose = vi.fn();
    const onUserCreated = vi.fn();
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
        // Increase timeout
        vi.setConfig({ testTimeout: 60000 });

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

        // Connect application instances to emulator
        try {
            connectFirestoreEmulator(db, emulator.host, emulator.port);
            connectAuthEmulator(auth, `http://${emulator.host}:9099`);
        } catch (e) {
            console.warn('Emulators might already be connected', e);
        }
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.spyOn(window, 'alert');

        await testEnv.clearFirestore();
        if (auth.currentUser) await signOut(auth);

        // Create and sign in as admin
        const email = 'admin@example.com';
        const password = 'password123';

        // We need to create the admin user in Auth Emulator
        // Since we cleared persistence/new test, we assume user doesn't exist or we handle error
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e) {
            // user might exist if auth emulator is persistent
            await signInWithEmailAndPassword(auth, email, password);
        }

        // Ensure we are signed in (createUser signs in automatically, but good to be sure if caught)
        if (!auth.currentUser) {
            await signInWithEmailAndPassword(auth, email, password);
        }

        // Seed admin data in Firestore (bypass rules)
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await adminDb.collection('users').doc(auth.currentUser!.uid).set({
                role: 'admin',
                email: email,
                displayName: 'Admin User'
            });
        });
    });

    test('creates a user in Firebase Auth and Firestore', async () => {
        const user = userEvent.setup();
        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // Wait for Auth Initialization
        await waitFor(() => {
            expect(screen.queryByText('Initializing...')).not.toBeInTheDocument();
        }, { timeout: 10000 });

        const email = `test-${Date.now()}@example.com`;

        // Fill form
        await user.type(screen.getByLabelText(/Display Name/i), 'Integration User');
        await user.type(screen.getByLabelText(/Full Name/i), 'Integration Full Name');
        await user.type(screen.getByLabelText(/Email Address/i), email);
        await user.type(screen.getByLabelText(/Phone Number/i), '0501234567');
        await user.selectOptions(screen.getByLabelText(/Role/i), USER_ROLES.INSTRUCTOR);

        await user.click(screen.getByRole('button', { name: /Create User/i }));

        // Wait for success
        await waitFor(() => {
            expect(onUserCreated).toHaveBeenCalled();
        }, { timeout: 15000 });

        expect(onClose).toHaveBeenCalled();

        // Verify in Firestore
        // Since we mocked Auth creation, we can't sign in. 
        // Instead we verify the Firestore document was created.
        // We search by email since we don't know the exact random UID generated by the mock (unless we queried the mock).

        // Check Firestore document
        const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        expect(querySnapshot.empty).toBe(false);
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        expect(userData?.displayName).toBe('Integration User');
        expect(userData?.role).toBe(USER_ROLES.INSTRUCTOR);
        expect(userData?.email).toBe(email.toLowerCase());
    });
});
