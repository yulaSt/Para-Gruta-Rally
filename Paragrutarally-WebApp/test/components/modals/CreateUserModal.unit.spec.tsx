import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateUserModal from '@/components/modals/CreateUserModal';
import { USER_ROLES } from '@/schemas/userSchema';

// Mocks
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockConnectAuthEmulator = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDeleteApp = vi.fn();
const mockInitializeApp = vi.fn();
const mockGetAuth = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: (...args) => mockInitializeApp(...args),
  deleteApp: (...args) => mockDeleteApp(...args),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (...args) => mockGetAuth(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  connectAuthEmulator: (...args) => mockConnectAuthEmulator(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ path: `${collection}/${id}` })),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
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
    // Default mocks behavior
    mockInitializeApp.mockReturnValue({});
    mockGetAuth.mockReturnValue({});
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'test-uid' },
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({}),
    });
    vi.spyOn(window, 'alert');
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

    await user.click(screen.getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(mockInitializeApp).toHaveBeenCalled();
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', '123456');
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockDeleteApp).toHaveBeenCalled();
      expect(onUserCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('connects auth emulator when enabled', async () => {
    process.env.VITE_USE_FIREBASE_EMULATORS = 'true';

    const user = userEvent.setup();
    render(<CreateUserModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    await user.type(screen.getByLabelText(/Display Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Full Name/i), 'Test Full Name');
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Phone Number/i), '0501234567');
    await user.selectOptions(screen.getByLabelText(/Role/i), USER_ROLES.INSTRUCTOR);

    await user.click(screen.getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(mockConnectAuthEmulator).toHaveBeenCalledWith(expect.anything(), 'http://127.0.0.1:9099');
    });
  });

  it('handles email already in use error', async () => {
    const user = userEvent.setup();
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });
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
