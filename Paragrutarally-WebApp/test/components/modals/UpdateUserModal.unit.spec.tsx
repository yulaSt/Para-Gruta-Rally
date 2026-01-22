import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateUserModal from '@/components/modals/UpdateUserModal';
import { USER_ROLES } from '@/schemas/userSchema';

// Mocks
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ path: `${collection}/${id}` })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => 'timestamp',
  getFirestore: vi.fn(),
  Timestamp: class {
    static now() { return { toDate: () => new Date() }; }
  }
}));

vi.mock('@/firebase/config.js', () => ({
  db: {},
}));

// Mock LanguageContext
vi.mock('../../../src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key, defaultText, params) => {
        if (params && params.displayName) {
             return defaultText.replace('{displayName}', params.displayName);
        }
        return defaultText || key;
    },
    isRTL: false,
  }),
}));

describe('UpdateUserModal', () => {
  const onClose = vi.fn();
  const onUserUpdated = vi.fn();
  const mockUser = {
    id: 'test-user-id',
    displayName: 'Old Name',
    name: 'Old Full Name',
    email: 'old@example.com',
    phone: '0500000000',
    role: USER_ROLES.PARENT
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert');
  });

  it('renders correctly with user data', () => {
    render(<UpdateUserModal isOpen={true} onClose={onClose} user={mockUser} onUserUpdated={onUserUpdated} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Using heading role to avoid ambiguity with the button
    expect(screen.getByRole('heading', { name: /Update User/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old Full Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0500000000')).toBeInTheDocument();
    
    // Check role selection. 'Parent' is the text content, value is 'parent'.
    // We can check if the select has value 'parent'
    expect(screen.getByLabelText(/Role/i)).toHaveValue(USER_ROLES.PARENT);
    
    // Email should be disabled
    const emailInput = screen.getByDisplayValue('old@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('updates user successfully', async () => {
    const user = userEvent.setup();
    render(<UpdateUserModal isOpen={true} onClose={onClose} user={mockUser} onUserUpdated={onUserUpdated} />);

    // Change fields
    const displayNameInput = screen.getByLabelText(/Display Name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'New Name');

    await user.click(screen.getByRole('button', { name: /Update User/i }));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
      // Check if updateDoc was called with correct data
      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData.displayName).toBe('New Name');
      
      expect(onUserUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });
  });

  it('disables submit button if validation fails', async () => {
    const user = userEvent.setup();
    render(<UpdateUserModal isOpen={true} onClose={onClose} user={mockUser} onUserUpdated={onUserUpdated} />);

    // Clear required field
    const fullNameInput = screen.getByLabelText(/Full Name/i);
    await user.clear(fullNameInput);
    
    // Button should be disabled because real-time validation caught the error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update User/i })).toBeDisabled();
    });
    
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('handles update error', async () => {
    const user = userEvent.setup();
    mockUpdateDoc.mockRejectedValue(new Error('Update failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<UpdateUserModal isOpen={true} onClose={onClose} user={mockUser} onUserUpdated={onUserUpdated} />);

    // Make a change to enable save
    const nameInput = screen.getByLabelText(/Display Name/i);
    await user.type(nameInput, ' Updated');
    
    await user.click(screen.getByRole('button', { name: /Update User/i }));

    await waitFor(() => {
       // Should show error alert or message
       expect(screen.getByText('Failed to update user. Please try again.')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });
});
