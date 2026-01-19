import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersTable from '@/components/tables/UsersTable';

// Mock useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, fallback: string) => fallback,
    isRTL: false,
  })),
}));

// Mock deleteUserCompletely from userService
vi.mock('@/services/userService.js', () => ({
  deleteUserCompletely: vi.fn(),
}));

import { deleteUserCompletely } from '@/services/userService.js';

const mockedDeleteUserCompletely = vi.mocked(deleteUserCompletely);

// Test data
const mockUsers = [
  {
    id: 'user-1',
    displayName: 'Alice Admin',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '123-456-7890',
    role: 'admin',
    lastLogin: { toDate: () => new Date('2024-01-15T10:30:00Z') },
    createdAt: { toDate: () => new Date('2023-01-01T00:00:00Z') },
  },
  {
    id: 'user-2',
    displayName: 'Bob Parent',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '098-765-4321',
    role: 'parent',
    lastLogin: { toDate: () => new Date('2024-01-10T08:00:00Z') },
    createdAt: { toDate: () => new Date('2023-06-15T00:00:00Z') },
  },
  {
    id: 'user-3',
    displayName: 'Charlie Instructor',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '555-123-4567',
    role: 'instructor',
    lastLogin: { toDate: () => new Date('2024-01-12T14:00:00Z') },
    createdAt: { toDate: () => new Date('2023-03-20T00:00:00Z') },
  },
];

describe('UsersTable', () => {
  let mockOnUpdateUser: ReturnType<typeof vi.fn>;
  let mockOnUserDeleted: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockOnUpdateUser = vi.fn();
    mockOnUserDeleted = vi.fn();
    mockAlert = vi.fn();
    vi.stubGlobal('alert', mockAlert);
  });

  describe('sorting', () => {
    test('sort toggles per header click: asc -> desc -> reset', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Find the Display Name header and verify initial state (no sort)
      const displayNameHeader = screen.getByRole('columnheader', { name: /display name/i });
      expect(displayNameHeader).toHaveTextContent('↕'); // Default unsorted indicator

      // First click: ascending sort
      await user.click(displayNameHeader);
      expect(displayNameHeader).toHaveTextContent('↑');

      // Verify order: Alice -> Bob -> Charlie (ascending by displayName)
      const rows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(within(rows[0]).getByText('Alice Admin')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Bob Parent')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Charlie Instructor')).toBeInTheDocument();

      // Second click: descending sort
      await user.click(displayNameHeader);
      expect(displayNameHeader).toHaveTextContent('↓');

      // Verify order: Charlie -> Bob -> Alice (descending by displayName)
      const rowsDesc = screen.getAllByRole('row').slice(1);
      expect(within(rowsDesc[0]).getByText('Charlie Instructor')).toBeInTheDocument();
      expect(within(rowsDesc[1]).getByText('Bob Parent')).toBeInTheDocument();
      expect(within(rowsDesc[2]).getByText('Alice Admin')).toBeInTheDocument();

      // Third click: reset sort
      await user.click(displayNameHeader);
      expect(displayNameHeader).toHaveTextContent('↕');
    });

    test('clicking different column resets previous sort and starts ascending', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      const displayNameHeader = screen.getByRole('columnheader', { name: /display name/i });
      const emailHeader = screen.getByRole('columnheader', { name: /email/i });

      // Sort by display name first
      await user.click(displayNameHeader);
      expect(displayNameHeader).toHaveTextContent('↑');
      expect(emailHeader).toHaveTextContent('↕');

      // Click email header - should reset display name and start ascending on email
      await user.click(emailHeader);
      expect(emailHeader).toHaveTextContent('↑');
      expect(displayNameHeader).toHaveTextContent('↕');
    });
  });

  describe('delete confirmation flow', () => {
    test('clicking Delete opens confirmation modal with correct user details', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Find the delete button for Alice
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Modal should be visible with user details - scope to modal
      const modal = screen.getByTestId('delete-user-modal');
      const modalContent = within(modal);

      expect(modalContent.getByText('Delete User')).toBeInTheDocument();
      expect(modalContent.getByText('Alice Admin')).toBeInTheDocument();
      expect(modalContent.getByText('alice@example.com')).toBeInTheDocument();
      expect(modalContent.getByText('Alice Johnson')).toBeInTheDocument();
    });

    test('clicking overlay (outside modal) cancels and closes modal', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Verify modal is open
      expect(screen.getByText('Delete User')).toBeInTheDocument();

      // Click the overlay (outside modal)
      const overlay = screen.getByTestId('delete-user-modal-overlay');
      await user.click(overlay);

      // Modal should be closed
      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });

    test('clicking Cancel button closes modal', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should be closed
      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });

    test('confirm calls deleteUserCompletely and then calls onUserDeleted', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      mockedDeleteUserCompletely.mockResolvedValue({
        success: true,
        message: 'User deleted',
        deletedUserId: 'user-1',
        deletedUserEmail: 'alice@example.com',
      });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Open modal for first user (Alice)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /yes, delete user completely/i });
      await user.click(confirmButton);

      // Verify deleteUserCompletely was called with correct user ID
      expect(mockedDeleteUserCompletely).toHaveBeenCalledWith('user-1');

      // Verify success alert was shown
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('User Deleted Successfully')
      );

      // Verify onUserDeleted was called
      expect(mockOnUserDeleted).toHaveBeenCalled();
    });

    test('error path: service rejects; shows error alert and does not call onUserDeleted', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockedDeleteUserCompletely.mockRejectedValue(
        new Error('Permission denied. You may not have rights to delete this user.')
      );

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /yes, delete user completely/i });
      await user.click(confirmButton);

      // Verify error alert was shown
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );

      // Verify onUserDeleted was NOT called
      expect(mockOnUserDeleted).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('loading and empty states', () => {
    test('shows loading state when isLoading is true', () => {
      render(
        <UsersTable
          users={[]}
          isLoading={true}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    test('shows empty state when no users', () => {
      render(
        <UsersTable
          users={[]}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('update functionality', () => {
    test('clicking Update calls onUpdateUser with correct user', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <UsersTable
          users={mockUsers}
          isLoading={false}
          onUpdateUser={mockOnUpdateUser}
          onUserDeleted={mockOnUserDeleted}
        />
      );

      // Click Update button for first user
      const updateButtons = screen.getAllByRole('button', { name: /update/i });
      await user.click(updateButtons[0]);

      expect(mockOnUpdateUser).toHaveBeenCalledWith(mockUsers[0]);
    });
  });
});
