import { afterAll, beforeAll, beforeEach, describe, expect, vi, test } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { signOut, connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import userEvent from '@testing-library/user-event';

import { auth, db } from '@/firebase/config';
import TeamsManagementPage from '@/pages/admin/TeamsManagementPage';
import AddTeamPage from '@/pages/admin/AddTeamPage';
import EditTeamPage from '@/pages/admin/EditTeamPage';
import { AuthProvider } from '@/contexts/AuthContext';
import LanguageContext from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PermissionProvider } from '@/hooks/usePermissions';
import { runTeamsManagementTests, TestData, defaultTeams, defaultInstructors, defaultKids } from './TeamsManagementPage.tests';

// Mock LanguageContext for UI simplicity
const mockLanguageContext = {
    t: (key: string, fallback: string, options?: any) => {
        let result = fallback || key;
        if (options) {
            Object.keys(options).forEach(k => {
                result = result.replace(`{${k}}`, String(options[k]));
            });
        }
        return result;
    },
    language: 'en',
    setLanguage: () => { },
    dir: 'ltr',
    isRTL: false,
    currentLanguage: 'en'
};

// We DO NOT mock services here, because we want to test integration with Firestore Emulator.
// But we might need to mock some non-firebase things if they are annoying.

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

describeWithFirestoreEmulator('TeamsManagementPage (Integration)', () => {
    beforeAll(async () => {
        // Increase timeout for integration tests
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
        // We use try/catch because if tests run in parallel or watch mode, it might already be connected
        try {
            connectFirestoreEmulator(db, emulator.host, emulator.port);
            connectAuthEmulator(auth, `http://${emulator.host}:9099`); // Assuming Auth is on 9099
        } catch (e) {
            console.warn('Emulators might already be connected', e);
        }
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
        if (auth.currentUser) await signOut(auth);
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    // SETUP FUNCTION FOR INTEGRATION TESTS
    const setupIntegration = async (data?: TestData) => {
        // 1. Authenticate FIRST to get the UID
        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        // 2. Seed Firestore
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();

            // Set Admin
            await db.collection('users').doc(uid).set({
                role: 'admin',
                email: 'admin@test.com',
                displayName: 'Admin User',
                createdAt: new Date(),
            });

            // Seed Data
            if (data) {
                // Teams
                for (const team of data.teams) {
                    await db.collection('teams').doc(team.id).set(team);
                }
                // Instructors (which are users with role instructor)
                for (const instructor of data.instructors) {
                    // Assuming instructor data structure matches user structure expected by getAllInstructors
                    // In defaultInstructors we have id, displayName, email.
                    // We need to make sure they are in 'users' collection with role 'instructor'
                    // or 'instructors' collection if that's what the app uses.
                    // App uses getAllInstructors from teamService.
                    // teamService uses: collection(db, 'users'), where('role', 'in', ['instructor', 'admin'])
                    
                    // So we put them in 'users'
                    await db.collection('users').doc(instructor.id).set({
                        ...instructor,
                        role: 'instructor' 
                    });
                }
                // Kids
                for (const kid of data.kids) {
                    await db.collection('kids').doc(kid.id).set(kid);
                }
            }
        });

        // 3. Small delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // 4. Render
        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter>
                                <TeamsManagementPage />
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // 5. Wait for Auth
        await waitFor(() => {
            expect(screen.queryByText(/Initializing/i)).not.toBeInTheDocument();
        }, { timeout: 15000 });

        // 6. Wait for Loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        }, { timeout: 10000 });

        // 7. Wait for data
        if (data && data.teams.length > 0) {
             const firstTeamName = data.teams[0].name;
             await screen.findByText(firstTeamName, {}, { timeout: 5000 });
        }
    };

    // EXECUTE SHARED TESTS
    runTeamsManagementTests(setupIntegration);

    // INTEGRATION FLOW TESTS
    test('Add Team Flow', async () => {
        const user = userEvent.setup();
        
        // 1. Auth and Seed (Admin only)
        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({
                role: 'admin',
                displayName: 'Admin User',
            });
            // Seed instructors/kids if needed for dropdowns
            await db.collection('users').doc('inst-1').set({
                displayName: 'Test Instructor',
                role: 'instructor',
                email: 'inst@test.com'
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={['/admin/teams']}>
                                <Routes>
                                    <Route path="/admin/teams" element={<TeamsManagementPage />} />
                                    <Route path="/admin/teams/add" element={<AddTeamPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // Click Add Team - Wait for it to appear (handling Auth + Loading states)
        const addBtn = await screen.findByRole('button', { name: /add new team/i }, { timeout: 30000 });
        await user.click(addBtn);

        // Expect to be on Add Team Page
        await screen.findByText('Create A Team!', {}, { timeout: 10000 });

        // Fill Form
        const nameInput = screen.getByRole('textbox', { name: /team name/i });
        await user.type(nameInput, 'Integration Team');

        // Select Instructor
        const instructorCard = await screen.findByText('Test Instructor');
        await user.click(instructorCard);

        // Submit
        const createBtn = screen.getByRole('button', { name: /create racing team/i });
        await user.click(createBtn);

        // Expect navigation to View Page (mocked content)
        await screen.findByText('Team View Page');
    });

    test('Edit Team Flow', async () => {
        const user = userEvent.setup();
        
        // 1. Auth and Seed
        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        const teamId = 'edit-team-id';

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({ role: 'admin', displayName: 'Admin' });
            
            // Create team to edit
            await db.collection('teams').doc(teamId).set({
                name: 'Original Team Name',
                maxCapacity: 10,
                active: true,
                instructorIds: [],
                kidIds: [],
                vehicleIds: [],
                createdAt: new Date()
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={[`/admin/teams/edit/${teamId}`]}>
                                <Routes>
                                    <Route path="/admin/teams/edit/:id" element={<EditTeamPage />} />
                                    <Route path="/admin/teams" element={<TeamsManagementPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // Wait for Auth
        await waitFor(() => {
            expect(screen.queryByText('Initializing...')).not.toBeInTheDocument();
        }, { timeout: 15000 });

        // Wait for load
        await screen.findByDisplayValue('Original Team Name');

        // Change Name
        const nameInput = screen.getByRole('textbox', { name: /team name/i });
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated Team Name');

        // Save
        const saveBtn = screen.getByRole('button', { name: /save updates/i });
        await user.click(saveBtn);

        // Expect navigation to View Page
        await screen.findByText('Team View Page');

        // Verify in Firestore?
        // Actually, we can verify via UI if we navigated back to list, but here we navigated to view.
    });

    // --- ONE INSTRUCTOR PER TEAM + INLINE INSTRUCTOR CREATION ---

    test('Add Team with inline instructor creates auth user, user doc, and team linked together', async () => {
        const user = userEvent.setup();

        // Sign in as admin and seed
        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({
                role: 'admin',
                displayName: 'Admin User',
                email: 'admin@test.com'
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={['/admin/teams/add']}>
                                <Routes>
                                    <Route path="/admin/teams/add" element={<AddTeamPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        // Wait until the form is fully loaded (loadInitialData transitions
        // isLoading false → true → false; getByRole would race against it).
        const createNewBtn = await screen.findByRole('button', { name: /create new/i }, { timeout: 30000 });

        // Fill team name
        const nameInput = screen.getByRole('textbox', { name: /team name/i });
        await user.type(nameInput, 'Inline Squad');

        // Switch to "Create New" instructor mode
        await user.click(createNewBtn);

        // Inline instructor fields — query by stable ids since labels carry an icon child.
        await user.type(await screen.findByPlaceholderText(/enter full name/i), 'Inline Instructor');
        await user.type(screen.getByPlaceholderText(/enter base location/i), 'Tel Aviv');
        const uniqueEmail = `inline-inst-${Date.now()}@test.com`;
        await user.type(screen.getByPlaceholderText(/enter email address/i), uniqueEmail);
        await user.type(document.getElementById('inst-password') as HTMLInputElement, 'pass123');
        await user.type(document.getElementById('inst-phone') as HTMLInputElement, '0501234567');

        // Submit
        const createBtn = screen.getByRole('button', { name: /create racing team/i });
        await user.click(createBtn);

        // Expect navigation to view page
        await screen.findByText('Team View Page', {}, { timeout: 15000 });

        // Verify via Firestore: team exists, instructor user exists, both linked
        const { collection, getDocs, query, where } = await import('firebase/firestore');

        const teamsSnap = await getDocs(query(collection(db, 'teams'), where('name', '==', 'Inline Squad')));
        expect(teamsSnap.empty).toBe(false);
        const team = teamsSnap.docs[0].data();
        expect(Array.isArray(team.instructorIds)).toBe(true);
        expect(team.instructorIds).toHaveLength(1);
        const instructorUid = team.instructorIds[0];
        expect(team.teamLeaderId).toBe(instructorUid);

        // Instructor doc should exist; password should NOT be persisted in Firestore.
        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', uniqueEmail)));
        expect(usersSnap.empty).toBe(false);
        const instructorDoc = usersSnap.docs[0];
        expect(instructorDoc.id).toBe(instructorUid);
        const instructorData = instructorDoc.data();
        expect(instructorData.role).toBe('instructor');
        expect(instructorData.name).toBe('Inline Instructor');
        expect(instructorData.location).toBe('Tel Aviv');
        expect(instructorData.phone).toBe('0501234567');
        expect(instructorData.password).toBeUndefined();
    });

    test('Add Team inline instructor: missing required fields shows errors and does not create user', async () => {
        const user = userEvent.setup();

        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({
                role: 'admin',
                displayName: 'Admin User',
                email: 'admin@test.com'
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={['/admin/teams/add']}>
                                <Routes>
                                    <Route path="/admin/teams/add" element={<AddTeamPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        const createNewBtn = await screen.findByRole('button', { name: /create new/i }, { timeout: 30000 });

        const nameInput = screen.getByRole('textbox', { name: /team name/i });
        await user.type(nameInput, 'Should Not Persist');

        await user.click(createNewBtn);

        // Submit without filling inline fields — should NOT navigate
        const createBtn = screen.getByRole('button', { name: /create racing team/i });
        await user.click(createBtn);

        // Still on Add Team page (no navigation to Team View Page)
        expect(screen.queryByText('Team View Page')).not.toBeInTheDocument();

        // Verify no team got created with this name
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const teamsSnap = await getDocs(query(collection(db, 'teams'), where('name', '==', 'Should Not Persist')));
        expect(teamsSnap.empty).toBe(true);
    });

    test('Add Team only allows one instructor selected from existing list', async () => {
        const user = userEvent.setup();

        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({
                role: 'admin',
                displayName: 'Admin User',
                email: 'admin@test.com'
            });
            await db.collection('users').doc('inst-a').set({
                displayName: 'Instructor Alpha',
                role: 'instructor',
                email: 'alpha@test.com',
                location: 'North'
            });
            await db.collection('users').doc('inst-b').set({
                displayName: 'Instructor Beta',
                role: 'instructor',
                email: 'beta@test.com',
                location: 'South'
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={['/admin/teams/add']}>
                                <Routes>
                                    <Route path="/admin/teams/add" element={<AddTeamPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        await screen.findByRole('button', { name: /create new/i }, { timeout: 30000 });
        await user.type(screen.getByRole('textbox', { name: /team name/i }), 'Single Instr Team');

        // Select Alpha
        const alphaCard = (await screen.findByText('Instructor Alpha')).closest('.instructor-card') as HTMLElement;
        await user.click(alphaCard);
        expect(alphaCard.className).toContain('selected');

        // Now select Beta — Alpha should be deselected (single-select behavior)
        const betaCard = (await screen.findByText('Instructor Beta')).closest('.instructor-card') as HTMLElement;
        await user.click(betaCard);

        await waitFor(() => {
            expect(betaCard.className).toContain('selected');
            expect(alphaCard.className).not.toContain('selected');
        });

        // Submit
        const createBtn = screen.getByRole('button', { name: /create racing team/i });
        await user.click(createBtn);
        await screen.findByText('Team View Page', {}, { timeout: 15000 });

        // Verify Firestore: team has exactly one instructor, leader matches
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const teamsSnap = await getDocs(query(collection(db, 'teams'), where('name', '==', 'Single Instr Team')));
        expect(teamsSnap.empty).toBe(false);
        const team = teamsSnap.docs[0].data();
        expect(team.instructorIds).toEqual(['inst-b']);
        expect(team.teamLeaderId).toBe('inst-b');
    });

    test('Edit Team normalizes legacy multi-instructor data to a single instructor on load', async () => {
        const user = userEvent.setup();

        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        const teamId = 'legacy-multi-team';

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('users').doc(uid).set({ role: 'admin', displayName: 'Admin' });
            await db.collection('users').doc('legacy-inst-1').set({
                displayName: 'Legacy Inst One',
                role: 'instructor',
                email: 'l1@test.com'
            });
            await db.collection('users').doc('legacy-inst-2').set({
                displayName: 'Legacy Inst Two',
                role: 'instructor',
                email: 'l2@test.com'
            });
            // Legacy team has two instructors — the new rule allows only one.
            await db.collection('teams').doc(teamId).set({
                name: 'Legacy Multi Team',
                maxCapacity: 10,
                active: true,
                instructorIds: ['legacy-inst-1', 'legacy-inst-2'],
                teamLeaderId: 'legacy-inst-2',
                kidIds: [],
                vehicleIds: [],
                createdAt: new Date()
            });
        });

        render(
            <AuthProvider>
                <ThemeProvider>
                    <LanguageContext.Provider value={mockLanguageContext}>
                        <PermissionProvider>
                            <MemoryRouter initialEntries={[`/admin/teams/edit/${teamId}`]}>
                                <Routes>
                                    <Route path="/admin/teams/edit/:id" element={<EditTeamPage />} />
                                    <Route path="/admin/teams/view/:id" element={<div>Team View Page</div>} />
                                </Routes>
                            </MemoryRouter>
                        </PermissionProvider>
                    </LanguageContext.Provider>
                </ThemeProvider>
            </AuthProvider>
        );

        await screen.findByDisplayValue('Legacy Multi Team', {}, { timeout: 15000 });

        // Only the original teamLeader (legacy-inst-2) remains selected; the other becomes unselected.
        await waitFor(() => {
            const twoCard = screen.getByText('Legacy Inst Two').closest('.instructor-card') as HTMLElement;
            expect(twoCard.className).toContain('selected');
        });
        const oneCard = screen.getByText('Legacy Inst One').closest('.instructor-card') as HTMLElement;
        expect(oneCard.className).not.toContain('selected');

        // The normalization itself counts as a pending change — Save Updates must be enabled
        // with no other edits, otherwise Firestore keeps the legacy multi-instructor data.
        const saveBtn = await screen.findByRole('button', { name: /save updates/i }, { timeout: 15000 });
        expect(saveBtn).not.toBeDisabled();
        await user.click(saveBtn);
        await screen.findByText('Team View Page', {}, { timeout: 15000 });

        const { doc, getDoc } = await import('firebase/firestore');
        const updated = await getDoc(doc(db, 'teams', teamId));
        const data = updated.data() as any;
        expect(data.instructorIds).toEqual(['legacy-inst-2']);
        expect(data.teamLeaderId).toBe('legacy-inst-2');
    });
});
