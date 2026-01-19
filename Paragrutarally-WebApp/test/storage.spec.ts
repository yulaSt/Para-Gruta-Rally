import { beforeAll, beforeEach, afterAll, describe, test } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import {
  expectStoragePermissionDenied,
  expectStoragePermissionSucceeds,
  getStorageEmulatorMeta,
} from './utils';

const PROJECT_ID = 'test-project';
const FIREBASE_JSON = resolve(__dirname, '../firebase.json');
let testEnv: RulesTestEnvironment;

function bytes(size: number) {
  return new Uint8Array(size).fill(7);
}

beforeAll(async () => {
  const { host: storageHost, port: storagePort } = getStorageEmulatorMeta(FIREBASE_JSON);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: storageHost,
      port: storagePort,
      rules: readFileSync(resolve(__dirname, '../firebase/storage.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Storage rules', () => {
  test('default: unauthenticated user cannot read gallery files', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'gallery/events/Test Event/photo.png'), bytes(10), { contentType: 'image/png' })
    );

    const unauthStorage = testEnv.unauthenticatedContext().storage();
    await expectStoragePermissionDenied(getBytes(ref(unauthStorage, 'gallery/events/Test Event/photo.png')));
  });

  test('gallery: authenticated users can read', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'gallery/events/Test Event/photo.png'), bytes(10), { contentType: 'image/png' })
    );

    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionSucceeds(getBytes(ref(userStorage, 'gallery/events/Test Event/photo.png')));
  });

  test('gallery: non-staff cannot write', async () => {
    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(userStorage, 'gallery/events/Test Event/photo.png'), bytes(10), { contentType: 'image/png' })
    );
  });

  test('gallery: staff can create folder placeholder JSON', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(
        ref(staffStorage, 'gallery/events/Test Event/.folder_info.json'),
        bytes(10),
        { contentType: 'application/json' }
      )
    );
  });

  test('imports: staff can write their own Excel import', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'imports/kids/staff1/import.xlsx'), bytes(10), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
  });

  test('imports: staff cannot write another user import path', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(staffStorage, 'imports/kids/otherUser/import.xlsx'), bytes(10), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
  });

  test('imports: staff cannot upload non-Excel content types', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(staffStorage, 'imports/kids/staff1/not-excel.txt'), bytes(10), { contentType: 'text/plain' })
    );
  });

  test('exports: only staff can write', async () => {
    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(userStorage, 'exports/reports/report.xlsx'), bytes(10), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );

    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'exports/reports/report.xlsx'), bytes(10), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
  });

  test('kidsPFP: only staff can write, signed-in can read', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'kidsPFP/kid1.png'), bytes(10), { contentType: 'image/png' })
    );

    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(userStorage, 'kidsPFP/kid2.png'), bytes(10), { contentType: 'image/png' })
    );
    await expectStoragePermissionSucceeds(getBytes(ref(userStorage, 'kidsPFP/kid1.png')));
  });

  test('vehiclePhotos: only staff can write, signed-in can read', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'vehiclePhotos/veh1.png'), bytes(10), { contentType: 'image/png' })
    );

    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(userStorage, 'vehiclePhotos/veh2.png'), bytes(10), { contentType: 'image/png' })
    );
    await expectStoragePermissionSucceeds(getBytes(ref(userStorage, 'vehiclePhotos/veh1.png')));
  });

  test('forms attachments: staff can read/write, non-staff cannot read', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionSucceeds(
      uploadBytes(ref(staffStorage, 'forms/form1/attachments/file.pdf'), bytes(10), {
        contentType: 'application/pdf',
      })
    );
    await expectStoragePermissionSucceeds(getBytes(ref(staffStorage, 'forms/form1/attachments/file.pdf')));

    const userStorage = testEnv.authenticatedContext('alice').storage();
    await expectStoragePermissionDenied(getBytes(ref(userStorage, 'forms/form1/attachments/file.pdf')));
  });

  test('enforces max file size', async () => {
    const staffStorage = testEnv.authenticatedContext('staff1', { role: 'staff' }).storage();
    await expectStoragePermissionDenied(
      uploadBytes(ref(staffStorage, 'gallery/events/Test Event/too-big.png'), bytes(10 * 1024 * 1024 + 1), {
        contentType: 'image/png',
      })
    );
  });
});
