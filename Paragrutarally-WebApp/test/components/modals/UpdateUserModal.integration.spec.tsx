import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import UpdateUserModal from '@/components/modals/UpdateUserModal';
import { USER_ROLES } from '@/schemas/userSchema';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, connectAuthEmulator } from 'firebase/auth';
import { doc, getDoc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import LanguageContext from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mock LanguageContext
const mockLanguageContext = {
    t: (key: string, fallback: string, params?: any) => {
        if (params && params.displayName) {
            return fallback.replace('{displayName}', params.displayName);
        }
        return fallback || key;
    },
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
const FIRESTORE_RULES = readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8');

const hasFirestoreEmulator =
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) || Boolean(process.env.FIREBASE_EMULATOR_HUB);
const describeWithFirestoreEmulator = hasFirestoreEmulator ? describe : describe.skip;

describeWithFirestoreEmulator('UpdateUserModal Integration', () => {
    const onClose = vi.fn();
    const onUserUpdated = vi.fn();
    let testEnv: RulesTestEnvironment;
    let adminUid: string;

    beforeAll(async () => {
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
        const email = 'admin_update@example.com';
        const password = 'password123';

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            adminUid = cred.user.uid;
        } catch (e) {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            adminUid = cred.user.uid;
        }

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await adminDb.collection('users').doc(adminUid).set({
                role: 'admin',
                email: email,
                displayName: 'Admin User'
            });
        });
    });

    test('updates a user in Firestore', async () => {
        const user = userEvent.setup();

        // Create a target user to update
        const targetUid = 'target-user-uid';
        const targetUser = {
            id: targetUid,
            displayName: 'Original Name',
            name: 'Original Full Name',
            email: 'target@example.com',
            phone: '0501111111',
            role: USER_ROLES.PARENT,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Seed target user (Admin can write)
        await setDoc(doc(db, 'users', targetUid), targetUser);

        // Render modal
        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <UpdateUserModal isOpen={true} onClose={onClose} user={targetUser} onUserUpdated={onUserUpdated} />
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // Wait for Auth Initialization
        await waitFor(() => {
            expect(screen.queryByText('Initializing...')).not.toBeInTheDocument();
        }, { timeout: 10000 });

        // Change fields
        const nameInput = screen.getByLabelText(/Display Name/i);
        // Use fireEvent for reliability in this specific environment where userEvent.clear is flaky
        fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
        // Ensure state updated by verify value (though fireEvent is sync usually)
        expect(nameInput).toHaveValue('Updated Name');

        await user.selectOptions(screen.getByLabelText(/Role/i), USER_ROLES.HOST);

        // Use heading to distinguish from title if needed, or button text
        await user.click(screen.getByRole('button', { name: /Update User/i }));

        // Wait for success
        await waitFor(() => {
            expect(onUserUpdated).toHaveBeenCalled();
        });

        expect(onClose).toHaveBeenCalled();

        // Verify in Firestore
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        expect(userDoc.exists()).toBe(true);
        const userData = userDoc.data();
        expect(userData?.displayName).toBe('Updated Name');
        expect(userData?.role).toBe(USER_ROLES.HOST);
        expect(userData?.name).toBe('Original Full Name'); // Unchanged
    });
});
