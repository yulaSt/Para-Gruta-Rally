import { describe, vi, beforeEach, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddKidPage from '@/pages/admin/AddKidPage';

// --- MOCKS ---

const mockNavigate = vi.fn();

const {
    mockAddKid,
    mockGetNextParticipantNumber,
    mockGetAllInstructors,
    mockUploadKidPhoto,
    mockUsePermissions,
    mockUseLanguage,
    mockUseTheme,
    mockGetDocs,
} = vi.hoisted(() => {
    const mockT = (key: string, fallback: string) => fallback || key;
    return {
        mockAddKid: vi.fn(),
        mockGetNextParticipantNumber: vi.fn(),
        mockGetAllInstructors: vi.fn(),
        mockUploadKidPhoto: vi.fn(),
        mockUsePermissions: vi.fn(),
        mockUseLanguage: vi.fn(() => ({
            t: mockT,
            isHebrew: false,
            isRTL: false,
        })),
        mockUseTheme: vi.fn(() => ({
            isDarkMode: false,
            appliedTheme: 'light',
        })),
        mockGetDocs: vi.fn(),
    };
});

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/services/kidService', () => ({
    addKid: (...args: unknown[]) => mockAddKid(...args),
    getNextParticipantNumber: () => mockGetNextParticipantNumber(),
}));

vi.mock('@/services/teamService', () => ({
    getAllInstructors: () => mockGetAllInstructors(),
    getTeamWithDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/services/kidPhotoService.js', () => ({
    uploadKidPhoto: (...args: unknown[]) => mockUploadKidPhoto(...args),
    validatePhotoFile: vi.fn(),
    resizeImage: vi.fn(),
    getKidPhotoInfo: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    collection: vi.fn((db, name) => ({ name })),
    query: vi.fn((col, ...constraints) => col),
    where: vi.fn(),
    Timestamp: {
        now: () => ({ toDate: () => new Date() }),
    },
}));

vi.mock('@/firebase/config.js', () => ({
    db: {},
}));

// Mock Contexts
vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: () => mockUseLanguage(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => mockUseTheme(),
}));

vi.mock('@/hooks/usePermissions', () => ({
    usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/hooks/usePermissions.jsx', () => ({
    usePermissions: () => mockUsePermissions(),
}));

// Mock Components
vi.mock('@/components/layout/Dashboard', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dashboard">{children}</div>
    ),
}));

vi.mock('@/components/modals/CreateUserModal', () => ({
    default: ({ isOpen, onClose, onUserCreated }: { isOpen: boolean; onClose: () => void; onUserCreated: () => void }) => {
        if (!isOpen) return null;
        return (
            <div role="dialog" data-testid="create-user-modal">
                <h1>Create New Parent</h1>
                <button onClick={onClose}>Close</button>
                <button onClick={onUserCreated}>Create</button>
            </div>
        );
    },
}));

// Test data
const mockParents = [
    { id: 'parent-1', name: 'John Doe', displayName: 'John', email: 'john@test.com', phone: '0501234567', role: 'parent' },
    { id: 'parent-2', name: 'Jane Doe', displayName: 'Jane', email: 'jane@test.com', phone: '0521234567', role: 'parent' },
    { id: 'parent-3', name: 'Bob Smith', displayName: 'Bob', email: 'bob@test.com', phone: '0531234567', role: 'parent' },
];

const mockTeams = [
    { id: 'team-1', name: 'Team Alpha', active: true, kidIds: [] },
    { id: 'team-2', name: 'Team Beta', active: true, kidIds: ['kid-1'] },
];

describe('AddKidPage - Second Parent Feature', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        mockUsePermissions.mockReturnValue({
            permissions: true,
            userRole: 'admin',
            userData: { id: 'admin-1' },
            user: { uid: 'admin-uid' },
            loading: false,
            error: null,
        });

        mockUseLanguage.mockReturnValue({
            t: (key: string, fallback: string) => fallback || key,
            isHebrew: false,
            isRTL: false,
        });

        mockUseTheme.mockReturnValue({
            isDarkMode: false,
            appliedTheme: 'light',
        });

        mockGetNextParticipantNumber.mockResolvedValue('001');
        mockGetAllInstructors.mockResolvedValue([]);
        mockAddKid.mockResolvedValue('new-kid-id');

        // Mock getDocs for teams and parents
        mockGetDocs.mockImplementation((queryRef: { name?: string }) => {
            if (queryRef?.name === 'teams') {
                return Promise.resolve({
                    docs: mockTeams.map(team => ({
                        id: team.id,
                        data: () => team,
                    })),
                });
            }
            if (queryRef?.name === 'users') {
                return Promise.resolve({
                    docs: mockParents.map(parent => ({
                        id: parent.id,
                        data: () => parent,
                    })),
                });
            }
            return Promise.resolve({ docs: [] });
        });
    });

    const renderAddKidPage = async () => {
        render(
            <MemoryRouter>
                <AddKidPage />
            </MemoryRouter>
        );

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/loading permissions/i)).not.toBeInTheDocument();
        });
    };

    describe('Second Parent Checkbox', () => {
        test('checkbox to add second parent is visible', async () => {
            await renderAddKidPage();

            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            expect(checkbox).toBeInTheDocument();
            expect(checkbox).not.toBeChecked();
        });

        test('checking the checkbox shows second parent fields', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            expect(checkbox).toBeChecked();
            // Should now see second parent dropdown
            expect(screen.getByText(/Select Second Parent/i)).toBeInTheDocument();
        });

        test('unchecking the checkbox hides second parent fields', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });

            // Check then uncheck
            await user.click(checkbox);
            expect(screen.getByText(/Select Second Parent/i)).toBeInTheDocument();

            await user.click(checkbox);
            expect(screen.queryByText(/Select Second Parent/i)).not.toBeInTheDocument();
        });
    });

    describe('Second Parent Selection from Dropdown', () => {
        test('second parent dropdown shows available parents', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Show second parent section
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Find second parent dropdown (there should be two comboboxes now)
            const dropdowns = screen.getAllByRole('combobox');
            const secondParentDropdown = dropdowns[1]; // Second dropdown

            expect(secondParentDropdown).toBeInTheDocument();
        });

        test('second parent dropdown excludes first selected parent', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Select first parent
            const dropdowns = screen.getAllByRole('combobox');
            const firstParentDropdown = dropdowns[0];
            await user.selectOptions(firstParentDropdown, 'parent-1');

            // Show second parent section
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Get second parent dropdown
            const updatedDropdowns = screen.getAllByRole('combobox');
            const secondParentDropdown = updatedDropdowns[1];

            // First parent should not be in second dropdown options
            const options = secondParentDropdown.querySelectorAll('option');
            const optionValues = Array.from(options).map(opt => opt.value);
            expect(optionValues).not.toContain('parent-1');
            expect(optionValues).toContain('parent-2');
            expect(optionValues).toContain('parent-3');
        });

        test('selecting second parent shows their info as locked fields', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Show second parent section
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Select second parent
            const dropdowns = screen.getAllByRole('combobox');
            const secondParentDropdown = dropdowns[1];
            await user.selectOptions(secondParentDropdown, 'parent-2');

            // Should show locked fields with Jane's info
            await waitFor(() => {
                const inputs = screen.getAllByRole('textbox');
                const disabledInputs = inputs.filter(input => input.hasAttribute('disabled'));
                expect(disabledInputs.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Second Parent Manual Entry', () => {
        test('shows manual entry fields when no second parent selected', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Show second parent section
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Should see manual entry placeholders for second parent
            // The second set of name/email/phone inputs should be visible
            const nameInputs = screen.getAllByPlaceholderText(/Racing coach's name/i);
            expect(nameInputs.length).toBeGreaterThanOrEqual(1);
        });

        test('can type in second parent manual entry fields', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Show second parent section
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Find the manual entry inputs (there will be two sets)
            const nameInputs = screen.getAllByPlaceholderText(/Racing coach's name/i);
            const emailInputs = screen.getAllByPlaceholderText(/parent@racingfamily.com/i);
            const phoneInputs = screen.getAllByPlaceholderText(/Racing hotline/i);

            // Type in second parent fields (last ones in the array)
            const secondNameInput = nameInputs[nameInputs.length - 1];
            const secondEmailInput = emailInputs[emailInputs.length - 1];
            const secondPhoneInput = phoneInputs[phoneInputs.length - 1];

            await user.type(secondNameInput, 'Second Parent Name');
            await user.type(secondEmailInput, 'second@parent.com');
            await user.type(secondPhoneInput, '0541234567');

            expect(secondNameInput).toHaveValue('Second Parent Name');
            expect(secondEmailInput).toHaveValue('second@parent.com');
            expect(secondPhoneInput).toHaveValue('0541234567');
        });
    });

    describe('Form Submission with Second Parent', () => {
        test('submits form with second parent info from dropdown selection', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Fill required fields
            await user.type(screen.getByPlaceholderText(/Future champion's first name/i), 'Test');
            await user.type(screen.getByPlaceholderText(/Racing family name/i), 'Kid');

            // Find date input by type
            const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
            await user.type(dateInput, '2015-01-15');

            // Select first parent
            const dropdowns = screen.getAllByRole('combobox');
            await user.selectOptions(dropdowns[0], 'parent-1');

            // Add second parent
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Select second parent
            const updatedDropdowns = screen.getAllByRole('combobox');
            await user.selectOptions(updatedDropdowns[1], 'parent-2');

            // Submit
            const submitButton = screen.getByRole('button', { name: /Add to Racing Team/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockAddKid).toHaveBeenCalled();
                const callArg = mockAddKid.mock.calls[0][0];

                // Verify parentIds includes both parents
                expect(callArg.parentInfo.parentIds).toContain('parent-1');
                expect(callArg.parentInfo.parentIds).toContain('parent-2');

                // Verify secondParentInfo is populated
                expect(callArg.secondParentInfo).toBeDefined();
                expect(callArg.secondParentInfo.name).toBe('Jane Doe');
                expect(callArg.secondParentInfo.email).toBe('jane@test.com');
            });
        });

        test('submits form with manually entered second parent info', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Fill required fields
            await user.type(screen.getByPlaceholderText(/Future champion's first name/i), 'Test');
            await user.type(screen.getByPlaceholderText(/Racing family name/i), 'Kid');

            // Find date input by type
            const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
            await user.type(dateInput, '2015-01-15');

            // Fill first parent manually
            const nameInputs = screen.getAllByPlaceholderText(/Racing coach's name/i);
            const emailInputs = screen.getAllByPlaceholderText(/parent@racingfamily.com/i);
            const phoneInputs = screen.getAllByPlaceholderText(/Racing hotline/i);

            await user.type(nameInputs[0], 'First Parent');
            await user.type(emailInputs[0], 'first@parent.com');
            await user.type(phoneInputs[0], '0501234567');

            // Add second parent
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Get updated inputs after checkbox toggle
            const updatedNameInputs = screen.getAllByPlaceholderText(/Racing coach's name/i);
            const updatedEmailInputs = screen.getAllByPlaceholderText(/parent@racingfamily.com/i);
            const updatedPhoneInputs = screen.getAllByPlaceholderText(/Racing hotline/i);

            // Fill second parent manually (last inputs)
            await user.type(updatedNameInputs[updatedNameInputs.length - 1], 'Second Parent');
            await user.type(updatedEmailInputs[updatedEmailInputs.length - 1], 'second@parent.com');
            await user.type(updatedPhoneInputs[updatedPhoneInputs.length - 1], '0521234567');

            // Submit
            const submitButton = screen.getByRole('button', { name: /Add to Racing Team/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockAddKid).toHaveBeenCalled();
                const callArg = mockAddKid.mock.calls[0][0];

                // Verify secondParentInfo has manual entry data
                expect(callArg.secondParentInfo).toBeDefined();
                expect(callArg.secondParentInfo.name).toBe('Second Parent');
                expect(callArg.secondParentInfo.email).toBe('second@parent.com');
                expect(callArg.secondParentInfo.phone).toBe('0521234567');
            });
        });

        test('unchecking second parent clears secondParentInfo before submit', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Fill required fields
            await user.type(screen.getByPlaceholderText(/Future champion's first name/i), 'Test');
            await user.type(screen.getByPlaceholderText(/Racing family name/i), 'Kid');

            // Find date input by type
            const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
            await user.type(dateInput, '2015-01-15');

            // Select first parent
            const dropdowns = screen.getAllByRole('combobox');
            await user.selectOptions(dropdowns[0], 'parent-1');

            // Add second parent
            const checkbox = screen.getByRole('checkbox', { name: /add second parent/i });
            await user.click(checkbox);

            // Select second parent
            const updatedDropdowns = screen.getAllByRole('combobox');
            await user.selectOptions(updatedDropdowns[1], 'parent-2');

            // Uncheck to remove second parent
            await user.click(checkbox);

            // Submit
            const submitButton = screen.getByRole('button', { name: /Add to Racing Team/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockAddKid).toHaveBeenCalled();
                const callArg = mockAddKid.mock.calls[0][0];

                // parentIds should only have first parent
                expect(callArg.parentInfo.parentIds).toContain('parent-1');
                expect(callArg.parentInfo.parentIds).not.toContain('parent-2');

                // secondParentInfo should be empty
                expect(callArg.secondParentInfo.name).toBe('');
                expect(callArg.secondParentInfo.email).toBe('');
                expect(callArg.secondParentInfo.phone).toBe('');
            });
        });
    });

    describe('Create New Parent Modal', () => {
        test('clicking create new parent button opens modal', async () => {
            const user = userEvent.setup();
            await renderAddKidPage();

            // Click create parent button (first one)
            const createButtons = screen.getAllByRole('button', { name: /Create New Parent/i });

            // Mock window.confirm to return true
            vi.spyOn(window, 'confirm').mockReturnValue(true);

            await user.click(createButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('create-user-modal')).toBeInTheDocument();
            });
        });
    });
});
