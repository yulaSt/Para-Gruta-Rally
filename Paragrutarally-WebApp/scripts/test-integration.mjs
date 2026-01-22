import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

function canConnectTcp(host, port, timeoutMs = 200) {
  return new Promise((resolve) => {
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

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env });
  process.exitCode = result.status ?? 1;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const defaultEnv = {
  ...process.env,
  VITE_USE_FIREBASE_EMULATORS: 'true',
  FIREBASE_EMULATORS_PATH: process.env.FIREBASE_EMULATORS_PATH ?? '/tmp/firebase-emulators',
  FIREBASE_TOOLS_DISABLE_UPDATE_CHECK: process.env.FIREBASE_TOOLS_DISABLE_UPDATE_CHECK ?? '1',
};

const firestorePort = 8080;
const authPort = 9099;

const candidateHosts = ['127.0.0.1', 'localhost', '::1'];

let detectedHost = null;
for (const host of candidateHosts) {
  if ((await canConnectTcp(host, firestorePort)) || (await canConnectTcp(host, authPort))) {
    detectedHost = host;
    break;
  }
}

const hasRunningEmulators = detectedHost != null;

if (hasRunningEmulators) {
  run(
    'vitest',
    ['run', '--no-file-parallelism', 'integration.spec'],
    {
      ...defaultEnv,
      FIRESTORE_EMULATOR_HOST: defaultEnv.FIRESTORE_EMULATOR_HOST ?? `${detectedHost}:${firestorePort}`,
      FIREBASE_AUTH_EMULATOR_HOST: defaultEnv.FIREBASE_AUTH_EMULATOR_HOST ?? `${detectedHost}:${authPort}`,
    }
  );
} else {
  const firebaseToolsHome = '/tmp/firebase-tools-home';
  const firebaseToolsConfig = '/tmp/firebase-tools-config';
  ensureDir(firebaseToolsHome);
  ensureDir(firebaseToolsConfig);

  run(
    'firebase',
    ['emulators:exec', '--only', 'auth,firestore', 'vitest run --no-file-parallelism integration.spec'],
    {
      ...defaultEnv,
      HOME: firebaseToolsHome,
      XDG_CONFIG_HOME: firebaseToolsConfig,
    }
  );
}
