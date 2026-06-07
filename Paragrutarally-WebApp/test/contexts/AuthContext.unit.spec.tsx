import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authMock = vi.hoisted(() => ({
  currentUser: null as null | { uid: string; email: string; displayName?: string },
}));

const functionsMock = vi.hoisted(() => ({}));
const mockSignInWithPopup = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockHttpsCallable = vi.hoisted(() => vi.fn());
const mockCompleteGoogleSignIn = vi.hoisted(() => vi.fn());

vi.mock('@/firebase/config', () => ({
  auth: authMock,
  db: {},
  functions: functionsMock,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
    return { providerId: 'google.com' };
  }),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  setDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AuthHarness() {
  const { error, signInWithGoogle } = useAuth();

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void signInWithGoogle().catch(() => {});
        }}
      >
        Google sign in
      </button>
      <div data-testid="auth-error">{error || ''}</div>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>
  );
}

describe('AuthContext Google sign-in', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    authMock.currentUser = null;
    mockCompleteGoogleSignIn.mockReset();
    mockHttpsCallable.mockReset();
    mockSignInWithPopup.mockReset();
    mockSignOut.mockReset();

    mockHttpsCallable.mockReturnValue(mockCompleteGoogleSignIn);
    mockSignOut.mockImplementation(async () => {
      authMock.currentUser = null;
    });
  });

  test('finalizes Google sign-in through the server callable', async () => {
    const googleUser = {
      uid: 'google-user-1',
      email: 'known@example.com',
      displayName: 'Known User',
    };

    mockSignInWithPopup.mockImplementation(async () => {
      authMock.currentUser = googleUser;
      return { user: googleUser };
    });
    mockCompleteGoogleSignIn.mockResolvedValue({ data: { success: true } });

    renderHarness();
    await userEvent.click(await screen.findByRole('button', { name: /google sign in/i }));

    await waitFor(() => {
      expect(mockCompleteGoogleSignIn).toHaveBeenCalledOnce();
    });
    expect(mockHttpsCallable).toHaveBeenCalledWith(functionsMock, 'completeGoogleSignIn');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('signs out the just-created Google Auth user when server authorization fails', async () => {
    const googleUser = {
      uid: 'google-user-2',
      email: 'orphan@example.com',
      displayName: 'Orphan User',
    };

    mockSignInWithPopup.mockImplementation(async () => {
      authMock.currentUser = googleUser;
      return { user: googleUser };
    });
    mockCompleteGoogleSignIn.mockRejectedValue(
      new Error('This email is not authorized to access this application.')
    );

    renderHarness();
    await userEvent.click(await screen.findByRole('button', { name: /google sign in/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith(authMock);
    });
    expect(authMock.currentUser).toBeNull();
    expect(screen.getByTestId('auth-error')).toHaveTextContent(
      'This email is not authorized to access this application.'
    );
  });
});
