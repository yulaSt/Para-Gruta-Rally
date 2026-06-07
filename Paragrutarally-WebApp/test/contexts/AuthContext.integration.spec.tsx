import React from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { signInAnonymously, signOut } from 'firebase/auth';

import { auth } from '@/firebase/config';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { parseHostAndPort } from '../utils';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? 'test-project';
const FIRESTORE_RULES = readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8');

const hasFirebaseEmulators =
  Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
  (Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) || Boolean(process.env.FIREBASE_EMULATOR_HUB));
const describeWithEmulators = hasFirebaseEmulators ? describe : describe.skip;

let testEnv: RulesTestEnvironment;

function AuthProbe() {
  const { authInitialized, currentUser, loading, userRole } = useAuth();

  return (
    <div>
      <div data-testid="auth-initialized">{String(authInitialized)}</div>
      <div data-testid="auth-loading">{String(loading)}</div>
      <div data-testid="current-user">{currentUser?.uid || ''}</div>
      <div data-testid="user-role">{userRole || ''}</div>
    </div>
  );
}

describeWithEmulators('AuthContext orphan profile handling', () => {
  beforeAll(async () => {
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
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    if (auth.currentUser) await signOut(auth);
  });

  afterAll(async () => {
    if (auth.currentUser) await signOut(auth);
    await testEnv.cleanup();
  });

  test('signs out an authenticated user that has no Firestore user profile', async () => {
    const userCredential = await signInAnonymously(auth);
    const orphanUid = userCredential.user.uid;

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('auth-initialized')).toHaveTextContent('true');
      },
      { timeout: 15000 }
    );

    await waitFor(() => {
      expect(auth.currentUser).toBeNull();
    });
    expect(screen.getByTestId('current-user')).toHaveTextContent('');
    expect(screen.getByTestId('user-role')).toHaveTextContent('');

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const missingProfile = await context.firestore().collection('users').doc(orphanUid).get();
      expect(missingProfile.exists).toBe(false);
    });
  });
});
