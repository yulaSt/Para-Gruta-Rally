import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { expect } from 'vitest';

/**
 * Parse host and port from FIRESTORE_EMULATOR_HOST environment variable.
 */
export function parseHostAndPort(hostAndPort: string | undefined): { host: string; port: number } | undefined {
  if (hostAndPort == undefined) {
    return undefined;
  }
  const pieces = hostAndPort.split(':');
  return {
    host: pieces[0],
    port: parseInt(pieces[1], 10),
  };
}

/**
 * Get Firestore emulator coverage metadata.
 */
export function getFirestoreCoverageMeta(projectId: string, firebaseJsonPath: string) {
  const { emulators } = require(firebaseJsonPath);
  const hostAndPort = parseHostAndPort(process.env.FIRESTORE_EMULATOR_HOST);
  const { host, port } = hostAndPort ?? emulators.firestore;
  const normalizedHost = host || '127.0.0.1';
  const coverageUrl = `http://${normalizedHost}:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`;
  return {
    host: normalizedHost,
    port,
    coverageUrl,
  };
}

/**
 * Get Storage emulator metadata.
 */
export function getStorageEmulatorMeta(firebaseJsonPath: string) {
  const { emulators } = require(firebaseJsonPath);
  const hostAndPort = parseHostAndPort(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
  const { host, port } = hostAndPort ?? emulators.storage;
  return {
    host: host || '127.0.0.1',
    port,
  };
}

/**
 * Assert that a Firestore operation is denied.
 */
export async function expectFirestorePermissionDenied(promise: Promise<unknown>) {
  const errorResult = await assertFails(promise);
  expect(['permission-denied', 'PERMISSION_DENIED']).toContain(errorResult.code);
}

/**
 * Assert that a Firestore write operation succeeds.
 */
export async function expectFirestorePermissionSucceeds(promise: Promise<unknown>) {
  const successResult = await assertSucceeds(promise);
  expect(successResult).toBeUndefined();
}

/**
 * Assert that a Firestore read operation succeeds.
 */
export async function expectPermissionGetSucceeds(promise: Promise<unknown>) {
  const result = await assertSucceeds(promise);
  expect(result).toBeDefined();
}

/**
 * Assert that a Storage operation is denied.
 */
export async function expectStoragePermissionDenied(promise: Promise<unknown>) {
  const errorResult = await assertFails(promise);
  expect(
    [
      'storage/unauthorized',
      'storage/permission-denied',
      'permission-denied',
      'PERMISSION_DENIED',
      'unauthorized',
    ].some((code) => errorResult.code === code)
  ).toBe(true);
}

/**
 * Assert that a Storage operation succeeds.
 */
export async function expectStoragePermissionSucceeds(promise: Promise<unknown>) {
  await assertSucceeds(promise);
}
