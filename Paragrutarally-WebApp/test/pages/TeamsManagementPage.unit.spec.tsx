import { describe, vi, beforeEach, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamsManagementPage from '@/pages/admin/TeamsManagementPage';
import { runTeamsManagementTests, TestData } from './TeamsManagementPage.tests';

// --- MOCKS ---

// Services
const mockGetAllTeams = vi.fn();
const mockGetAllInstructors = vi.fn();
const mockDeleteTeam = vi.fn();

vi.mock('@/services/teamService', () => ({
    getAllTeams: (...args: unknown[]) => mockGetAllTeams(...args),
    getAllInstructors: (...args: unknown[]) => mockGetAllInstructors(...args),
    deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
}));

const mockGetAllKids = vi.fn();
vi.mock('@/services/kidService', () => ({
    getAllKids: (...args: unknown[]) => mockGetAllKids(...args),
}));

// Mock Permissions
const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions.jsx', () => ({
    usePermissions: () => mockUsePermissions(),
}));

// Mock LanguageContext
// Improved mockT to handle replacements
const mockT = (key: string, fallback: string, options?: Record<string, string | number>) => {
    let result = fallback || key;
    if (options) {
        Object.keys(options).forEach(k => {
            result = result.replace(`{${k}}`, String(options[k]));
        });
    }
    return result;
};

vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: vi.fn(() => ({
        t: mockT,
        isRTL: false,
    })),
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: vi.fn(() => ({
        isDarkMode: false,
        appliedTheme: 'light',
    })),
}));

// Mock Dashboard
vi.mock('@/components/layout/Dashboard', () => ({
    default: ({ children, requiredRole }: { children: React.ReactNode, requiredRole: string }) => (
        <div data-testid="dashboard" data-role={requiredRole}>{children}</div>
    ),
}));

// Mock ExportTeamsModal
vi.mock('@/components/modals/ExportTeamsModal', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
        if (!isOpen) return null;
        return (
            <div role="dialog">
                <div>Export Teams Modal</div>
                <button onClick={onClose}>Close</button>
            </div>
        );
    },
}));


describe('TeamsManagementPage (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default permissions
        mockUsePermissions.mockReturnValue({
            permissions: { canManageTeams: true },
            userRole: 'admin',
            loading: false,
            error: null
        });

        // Default empty returns
        mockGetAllTeams.mockResolvedValue([]);
        mockGetAllInstructors.mockResolvedValue([]);
        mockGetAllKids.mockResolvedValue([]);
    });

    // SETUP FUNCTION FOR UNIT TESTS
    const setupUnit = async (data?: TestData) => {
        if (!data) return;

        // Use mockImplementation to ensure the value persists
        mockGetAllTeams.mockImplementation(async () => data.teams);
        mockGetAllInstructors.mockImplementation(async () => data.instructors);
        mockGetAllKids.mockImplementation(async () => data.kids);

        render(
            <MemoryRouter>
                <TeamsManagementPage />
            </MemoryRouter>
        );

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        // Wait for data to render if we expect it
        if (data.teams.length > 0) {
            const firstTeamName = data.teams[0].name;
            await screen.findByText(firstTeamName);
        }
    };

    // EXECUTE SHARED TESTS
    runTeamsManagementTests(setupUnit);

    // SPECIFIC UNIT TESTS
    
    test('handles fetch error gracefully', async () => {
        mockGetAllTeams.mockRejectedValue(new Error('Fetch failed'));
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <MemoryRouter>
                <TeamsManagementPage />
            </MemoryRouter>
        );

        // Wait for error state
        await screen.findByText(/Failed to load teams/i);
        expect(screen.getByText(/Fetch failed/i)).toBeInTheDocument();
        
        // Try Again button
        const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
        expect(tryAgainBtn).toBeInTheDocument();

        consoleError.mockRestore();
    });

    test('handles permission error', async () => {
        mockUsePermissions.mockReturnValue({
            permissions: null,
            userRole: 'admin',
            loading: false,
            error: 'Access Denied'
        });

        render(
            <MemoryRouter>
                <TeamsManagementPage />
            </MemoryRouter>
        );

        await screen.findByText(/Permission Error/i);
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    test('handles permission loading state', async () => {
         mockUsePermissions.mockReturnValue({
            permissions: null,
            userRole: 'admin',
            loading: true,
            error: null
        });

        render(
            <MemoryRouter>
                <TeamsManagementPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading permissions/i)).toBeInTheDocument();
    });
});
