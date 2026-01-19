#!/usr/bin/env node
/**
 * Seed script for creating test users in Firebase emulators
 *
 * Usage: npm run seed:users
 *
 * Prerequisites: Firebase emulators must be running
 *   firebase emulators:start
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Configure for emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Initialize Firebase Admin (no credentials needed for emulators)
const app = initializeApp({
  projectId: 'paragrutarally-1188c'
});

const auth = getAuth(app);
const db = getFirestore(app);

// Test users to create
const TEST_USERS = [
  {
    email: 'admin@test.com',
    password: '123456',
    displayName: 'Test Admin',
    role: 'admin',
    name: 'Test Admin',
    phone: '0501234567'
  },
  {
    email: 'instructor@test.com',
    password: '123456',
    displayName: 'Test Instructor',
    role: 'instructor',
    name: 'Test Instructor',
    phone: '0521234567'
  },
  {
    email: 'parent@test.com',
    password: '123456',
    displayName: 'Test Parent',
    role: 'parent',
    name: 'Test Parent',
    phone: '0531234567'
  },
  {
    email: 'host@test.com',
    password: '123456',
    displayName: 'Test Host',
    role: 'host',
    name: 'Test Host',
    phone: '0541234567'
  }
];

async function createUser(userData) {
  const { email, password, displayName, role, name, phone } = userData;

  try {
    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      console.log(`  ⏭️  User ${email} already exists (uid: ${existingUser.uid})`);
      return existingUser.uid;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });

    // Create user document in Firestore
    const now = new Date();
    await db.collection('users').doc(userRecord.uid).set({
      displayName,
      email,
      name,
      phone,
      role,
      authProvider: 'email',
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      disabled: false
    });

    console.log(`  ✅ Created ${role}: ${email} (uid: ${userRecord.uid})`);
    return userRecord.uid;

  } catch (error) {
    console.error(`  ❌ Failed to create ${email}:`, error.message);
    throw error;
  }
}

async function seedUsers() {
  console.log('\n🌱 Seeding test users...\n');
  console.log('Connecting to emulators:');
  console.log(`  Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}\n`);

  const results = [];

  for (const user of TEST_USERS) {
    try {
      const uid = await createUser(user);
      results.push({ ...user, uid, success: true });
    } catch (error) {
      results.push({ ...user, success: false, error: error.message });
    }
  }

  console.log('\n📋 Summary:\n');
  console.log('┌─────────────────────────┬────────────┬──────────┐');
  console.log('│ Email                   │ Role       │ Password │');
  console.log('├─────────────────────────┼────────────┼──────────┤');
  for (const user of results) {
    if (user.success) {
      const email = user.email.padEnd(23);
      const role = user.role.padEnd(10);
      console.log(`│ ${email} │ ${role} │ 123456   │`);
    }
  }
  console.log('└─────────────────────────┴────────────┴──────────┘');

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\n⚠️  Some users failed to create:');
    for (const user of failed) {
      console.log(`  - ${user.email}: ${user.error}`);
    }
  }

  console.log('\n✨ Done!\n');
}

// Run the seeder
seedUsers().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
