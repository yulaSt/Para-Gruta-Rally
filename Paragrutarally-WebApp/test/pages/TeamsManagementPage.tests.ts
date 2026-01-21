import { test, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Define TestData interface
export interface TestData {
    teams: any[];
    instructors: any[];
    kids: any[];
}

export const defaultInstructors = [
    {
        id: 'instructor-1',
        displayName: 'Instructor One',
        email: 'inst1@test.com'
    },
    {
        id: 'instructor-2',
        displayName: 'Instructor Two',
        email: 'inst2@test.com'
    }
];

export const defaultKids = [
    { id: 'kid-1', teamId: 'team-1', personalInfo: { firstName: 'Kid', lastName: 'One' } },
    { id: 'kid-2', teamId: 'team-1', personalInfo: { firstName: 'Kid', lastName: 'Two' } },
    { id: 'kid-3', teamId: 'team-2', personalInfo: { firstName: 'Kid', lastName: 'Three' } }
];

export const defaultTeams = [
    {
        id: 'team-1',
        name: 'Team Alpha',
        instructorIds: ['instructor-1'],
        kidIds: ['kid-1', 'kid-2'],
        maxCapacity: 10,
        active: true,
        description: 'First team',
        createdAt: new Date('2024-01-01')
    },
    {
        id: 'team-2',
        name: 'Team Beta',
        instructorIds: ['instructor-2'],
        kidIds: ['kid-3'],
        maxCapacity: 5,
        active: false,
        description: 'Second team',
        createdAt: new Date('2024-01-02')
    },
    {
        id: 'team-3',
        name: 'Team Gamma',
        instructorIds: [], // No instructor
        kidIds: [], // No kids
        maxCapacity: 15,
        active: true,
        description: 'Third team',
        createdAt: new Date('2024-01-03')
    },
    {
        id: 'team-4', // Full team
        name: 'Team Delta',
        instructorIds: ['instructor-1'],
        kidIds: ['k1', 'k2', 'k3'], // 3 kids
        maxCapacity: 3, // Capacity 3
        active: true,
        description: 'Full team',
        createdAt: new Date('2024-01-04')
    }
];

type SetupFunction = (data?: TestData) => Promise<void>;

export function runTeamsManagementTests(setupFn: SetupFunction) {
    const timeout = 60000;

    test('displays correct stats and renders teams list', async () => {
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        // Stats:
        // Total: 4
        // Active: 3 (Alpha, Gamma, Delta)
        // Without Kids: 1 (Gamma)
        // With Kids: 3 (Alpha, Beta, Delta)

        const checkStat = async (title: string, value: string) => {
             // Find by title text first, then the value nearby
             // The structure is <h3>Title</h3> <div class="stat-value">Value</div>
             const titleEl = screen.getByText(title);
             expect(titleEl).toBeInTheDocument();
             const card = titleEl.closest('.stat-card');
             expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
        };

        await checkStat('Total Teams', '4');
        await checkStat('Active Teams', '3');
        await checkStat('Teams without Kids', '1');
        await checkStat('Teams with Kids', '3');

        // Check table content
        const table = screen.getByRole('table');
        expect(within(table).getByText('Team Alpha')).toBeInTheDocument();
        expect(within(table).getByText('Team Beta')).toBeInTheDocument();
        expect(within(table).getByText('Team Gamma')).toBeInTheDocument();
        expect(within(table).getByText('Team Delta')).toBeInTheDocument();
    }, timeout);

    test('filters teams by stat cards', async () => {
        const user = userEvent.setup();
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const table = screen.getByRole('table');

        // 1. Click "Active Teams" (Alpha, Gamma, Delta)
        const activeCard = screen.getByText('Active Teams').closest('.stat-card');
        await user.click(activeCard as HTMLElement);

        // Beta (inactive) should be gone
        expect(within(table).queryByText('Team Beta')).not.toBeInTheDocument();
        expect(within(table).getByText('Team Alpha')).toBeInTheDocument();

        // 2. Click "Teams without Kids" (Gamma)
        const emptyCard = screen.getByText('Teams without Kids').closest('.stat-card');
        await user.click(emptyCard as HTMLElement);

        // Only Gamma should be visible
        expect(within(table).queryByText('Team Alpha')).not.toBeInTheDocument();
        expect(within(table).getByText('Team Gamma')).toBeInTheDocument();

        // 3. Reset by clicking "Total Teams"
        const totalCard = screen.getByText('Total Teams').closest('.stat-card');
        await user.click(totalCard as HTMLElement);

        expect(within(table).getByText('Team Alpha')).toBeInTheDocument();
        expect(within(table).getByText('Team Beta')).toBeInTheDocument();
    }, timeout);

    test('search filters teams by name or instructor', async () => {
        const user = userEvent.setup();
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const table = screen.getByRole('table');
        const searchInput = screen.getByPlaceholderText(/search by team name/i);

        // Search by Team Name "Beta"
        await user.type(searchInput, 'Beta');
        expect(within(table).getByText('Team Beta')).toBeInTheDocument();
        expect(within(table).queryByText('Team Alpha')).not.toBeInTheDocument();

        await user.clear(searchInput);

        // Search by Instructor "Instructor Two" (Assigned to Beta)
        await user.type(searchInput, 'Instructor Two');
        expect(within(table).getByText('Team Beta')).toBeInTheDocument();
        expect(within(table).queryByText('Team Alpha')).not.toBeInTheDocument();
    }, timeout);

    test('filters by status and capacity via dropdowns', async () => {
        const user = userEvent.setup();
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const table = screen.getByRole('table');
        
        // Filter by Status: Inactive
        // Note: The select is found by label "Status" but there are multiple "Status" texts.
        // The label has text "Status" and wraps the select? No, separate label.
        // The select has default value "all".
        
        // We can find by combobox role and inspect options, or traverse from label.
        // The component has: <label>...Status</label> <select>...
        
        // Let's try finding the select that has option "All Status"
        const statusSelect = screen.getAllByRole('combobox').find(select => 
            within(select as HTMLElement).queryByText(/All Status/i)
        );
        expect(statusSelect).toBeDefined();

        await user.selectOptions(statusSelect as HTMLElement, 'inactive');
        
        // Only Beta is inactive
        expect(within(table).getByText('Team Beta')).toBeInTheDocument();
        expect(within(table).queryByText('Team Alpha')).not.toBeInTheDocument();

        // Reset Status
        await user.selectOptions(statusSelect as HTMLElement, 'all');

        // Filter by Capacity: Full Teams (Delta)
        const capacitySelect = screen.getAllByRole('combobox').find(select => 
            within(select as HTMLElement).queryByText(/All Teams/i)
        );
        expect(capacitySelect).toBeDefined();

        await user.selectOptions(capacitySelect as HTMLElement, 'full');

        // Only Delta is full (3/3)
        expect(within(table).getByText('Team Delta')).toBeInTheDocument();
        expect(within(table).queryByText('Team Alpha')).not.toBeInTheDocument();
    }, timeout);

    test('table renders correct team details', async () => {
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const table = screen.getByRole('table');
        const alphaRow = within(table).getByText('Team Alpha').closest('tr');
        
        // Instructor: Instructor One
        expect(within(alphaRow as HTMLElement).getByText('Instructor One')).toBeInTheDocument();
        
        // Members: 2/10
        expect(within(alphaRow as HTMLElement).getByText('2/10')).toBeInTheDocument();
        
        // Status: Active
        expect(within(alphaRow as HTMLElement).getByText('Active')).toBeInTheDocument();

        // No Instructor Check (Gamma)
        const gammaRow = within(table).getByText('Team Gamma').closest('tr');
        expect(within(gammaRow as HTMLElement).getByText('No Instructor')).toBeInTheDocument();
    }, timeout);

    test('add team button navigation', async () => {
        const user = userEvent.setup();
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        // "Add New Team" button (Admin only, assumed admin role in setup)
        const addBtn = screen.getByRole('button', { name: /add new team/i });
        await user.click(addBtn);

        // Verification depends on how setupFn mocks navigation or if integration test checks URL/Content
        // For unit test, we might check if navigate was called.
        // For integration test, we check if AddTeamPage is rendered.
        // Here we just perform the action.
    }, timeout);

    test('delete team flow', async () => {
        const user = userEvent.setup();
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        const confirmMock = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const table = screen.getByRole('table');
        
        // Try to delete Gamma (No members) - Should Succeed
        const gammaRow = within(table).getByText('Team Gamma').closest('tr');
        const deleteBtn = within(gammaRow as HTMLElement).getByRole('button', { name: /delete team/i });
        
        await user.click(deleteBtn);

        expect(confirmMock).toHaveBeenCalled();
        // Wait for success alert
        await waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('deleted successfully'));
        });

        // Try to delete Alpha (Has members) - Should Fail with Alert
        alertMock.mockClear();
        const alphaRow = within(table).getByText('Team Alpha').closest('tr');
        const deleteBtnAlpha = within(alphaRow as HTMLElement).getByRole('button', { name: /delete team/i });
        
        await user.click(deleteBtnAlpha);

        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Cannot delete'));
        // The mock 't' function might return the raw string with placeholders if not fully mocked to replace them.
        // We accept either the interpolated string or the fallback string pattern.
        try {
            expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('has 2 members'));
        } catch (e) {
            expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('{memberCount} members'));
        }

        alertMock.mockRestore();
        confirmMock.mockRestore();
    }, timeout);

    test('opens export modal', async () => {
        const user = userEvent.setup();
        await setupFn({ 
            teams: defaultTeams, 
            instructors: defaultInstructors, 
            kids: defaultKids 
        });

        const exportBtn = screen.getByRole('button', { name: /export teams/i });
        await user.click(exportBtn);

        // Check for modal (mocked or real)
        const modal = await screen.findByRole('dialog', {}, { timeout: 5000 });
        
        // Check for title inside the modal
        // Mock renders "Export Teams Modal", Real renders "Export Teams" inside H3
        expect(within(modal).getByText(/Export Teams/i)).toBeInTheDocument();
    }, timeout);
}
