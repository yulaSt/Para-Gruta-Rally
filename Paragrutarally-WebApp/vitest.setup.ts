import { afterEach, beforeEach, vi } from 'vitest';
import * as net from 'node:net';

function readViteEnv(key: string): string | undefined {
  // In Vitest, `import.meta.env` may exist but not include values unless provided.
  // Fall back to `process.env` so tests can control config via environment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importMetaEnv = (import.meta as any)?.env as Record<string, string | undefined> | undefined;
  return importMetaEnv?.[key] ?? process.env[key];
}

// Defaults for Firebase SDK initialization in tests.
process.env.VITE_FIREBASE_API_KEY ??= 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN ??= 'localhost';
process.env.VITE_FIREBASE_PROJECT_ID ??= 'test-project';
process.env.VITE_FIREBASE_STORAGE_BUCKET ??= 'test-project.appspot.com';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ??= 'test-sender';
process.env.VITE_FIREBASE_APP_ID ??= 'test-app-id';

function parseHostAndPort(hostAndPort: string | undefined): { host: string; port: number } | undefined {
  if (hostAndPort == null) return undefined;
  const [host, portString] = hostAndPort.split(':');
  const port = Number(portString);
  return Number.isFinite(port) ? { host, port } : undefined;
}

async function canConnectTcp(host: string, port: number, timeoutMs = 200): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });
    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Prefer explicitly enabling emulators during integration tests.
// If `.env` enables emulators, keep them enabled when they're reachable (even if the hub env var isn't present).
{
  const requested = readViteEnv('VITE_USE_FIREBASE_EMULATORS');
  const wantsEmulators = requested === 'true';
  const hasEmulatorHub = Boolean(process.env.FIREBASE_EMULATOR_HUB);

  if (!wantsEmulators) {
    process.env.VITE_USE_FIREBASE_EMULATORS = requested ?? 'false';
  } else {
    const firestoreEmulator = parseHostAndPort(process.env.FIRESTORE_EMULATOR_HOST) ?? {
      host: '127.0.0.1',
      port: 8080,
    };
    const authEmulator = parseHostAndPort(process.env.FIREBASE_AUTH_EMULATOR_HOST) ?? {
      host: '127.0.0.1',
      port: 9099,
    };

    const reachable =
      hasEmulatorHub ||
      (await canConnectTcp(firestoreEmulator.host, firestoreEmulator.port)) ||
      (await canConnectTcp(authEmulator.host, authEmulator.port));

    process.env.VITE_USE_FIREBASE_EMULATORS = reachable ? 'true' : 'false';

    if (reachable) {
      process.env.FIRESTORE_EMULATOR_HOST ??= `${firestoreEmulator.host}:${firestoreEmulator.port}`;
      process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${authEmulator.host}:${authEmulator.port}`;
    }
  }
}

beforeEach(() => {
  vi.resetAllMocks();

  if (process.env.VITEST_SHOW_LOGS !== 'true') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

afterEach(async () => {
  if (typeof window !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});

// JSDOM does not implement all browser APIs used by the app.
if (typeof window !== 'undefined') {
  window.alert = () => {};
  window.confirm = () => true;

  if (typeof HTMLAnchorElement !== 'undefined') {
    // Prevent JSDOM "navigation to another Document" noise from download links.
    HTMLAnchorElement.prototype.click = () => {};
  }

  if (typeof URL !== 'undefined') {
    const url = URL as unknown as {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };

    url.createObjectURL ??= () => 'blob:vitest';
    url.revokeObjectURL ??= () => {};
  }
}

// Extend `expect` with `jest-dom` matchers for DOM-enabled tests only.
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}
