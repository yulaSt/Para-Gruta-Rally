import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateUserModal from '@/components/modals/CreateUserModal';
import { USER_ROLES } from '@/schemas/userSchema';

// Mocks
const mockCreateUserAsAdmin = vi.hoisted(() => vi.fn());

vi.mock('@/services/adminUserService.jsx', () => ({
  createUserAsAdmin: (...args) => mockCreateUserAsAdmin(...args),
  DEFAULT_NEW_USER_PASSWORD: '123456',
}));

// Mock LanguageContext
vi.mock('../../../src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key, defaultText) => defaultText || key,
    isRTL: false,
  }),
}));

describe('CreateUserModal', () => {
  const onClose = vi.fn();
  const onUserCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_USE_FIREBASE_EMULATORS = 'false';
    mockCreateUserAsAdmin.mockResolvedValue({
      success: true,
      uid: 'test-uid',
      password: '123456',
    });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders correctly when open', () => {
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New User')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreateUserModal isOpen={false} onClose={onClose} onUserCreated={onUserCreated} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    // Click submit without filling anything
    await user.click(screen.getByRole('button', { name: /Create User/i }));

    // Expect alert to be called
    expect(window.alert).toHaveBeenCalled();
  });

  it('creates a user successfully', async () => {
    const user = userEvent.setup();
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    // Fill form
    await user.type(screen.getByLabelText(/Display Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Full Name/i), 'Test Full Name');
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Phone Number/i), '0501234567');
    await user.selectOptions(screen.getByLabelText(/Role/i), USER_ROLES.INSTRUCTOR);
    await user.type(await screen.findByLabelText(/Location/i), 'Tel Aviv');

    await user.click(screen.getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(mockCreateUserAsAdmin).toHaveBeenCalledWith(expect.objectContaining({
        displayName: 'Test User',
        name: 'Test Full Name',
        email: 'test@example.com',
        phone: '0501234567',
        role: USER_ROLES.INSTRUCTOR,
        location: 'Tel Aviv',
      }));
      expect(onUserCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not use client-side Firebase sign-up when creating users', async () => {
    process.env.VITE_USE_FIREBASE_EMULATORS = 'true';

    const user = userEvent.setup();
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    await user.type(screen.getByLabelText(/Display Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Full Name/i), 'Test Full Name');
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Phone Number/i), '0501234567');
    await user.selectOptions(screen.getByLabelText(/Role/i), USER_ROLES.INSTRUCTOR);
    await user.type(await screen.findByLabelText(/Location/i), 'Tel Aviv');

    await user.click(screen.getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(mockCreateUserAsAdmin).toHaveBeenCalledTimes(1);
    });
  });

  it('handles email already in use error', async () => {
    const user = userEvent.setup();
    mockCreateUserAsAdmin.mockRejectedValue(new Error('This email is already registered'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    // Fill form
    await user.type(screen.getByLabelText(/Display Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Full Name/i), 'Test Full Name');
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Phone Number/i), '0501234567');
    
    await user.click(screen.getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
        expect(screen.getByText('This email is already registered')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });
});
