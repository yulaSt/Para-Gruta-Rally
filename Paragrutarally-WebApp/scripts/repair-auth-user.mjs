#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import serviceAccount from '../credentials.json' with { type: 'json' };

const allowedRoles = new Set(['admin', 'instructor', 'parent', 'host']);

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function usage() {
  console.error([
    'Usage:',
    '  node scripts/repair-auth-user.mjs --email user@example.com --role parent --yes',
    '  node scripts/repair-auth-user.mjs --email user@example.com --delete-auth --yes',
    '',
    'Options:',
    '  --name "Full Name"       Override profile name/displayName',
    '  --phone "0500000000"     Set profile phone',
    '  --yes                    Required for writes/deletes'
  ].join('\n'));
}

const email = normalizeEmail(argValue('--email'));
const role = argValue('--role');
const name = argValue('--name');
const phone = argValue('--phone');
const confirmed = hasFlag('--yes');
const deleteAuth = hasFlag('--delete-auth');

if (!email || (!deleteAuth && !role)) {
  usage();
  process.exit(1);
}

if (!confirmed) {
  console.error('Refusing to write without --yes.');
  process.exit(1);
}

if (!deleteAuth && !allowedRoles.has(role)) {
  console.error(`Invalid role "${role}". Allowed roles: ${[...allowedRoles].join(', ')}`);
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

const authUser = await auth.getUserByEmail(email);

if (deleteAuth) {
  await auth.deleteUser(authUser.uid);
  console.log(JSON.stringify({
    action: 'deleted-auth-user',
    uid: authUser.uid,
    email: authUser.email || email
  }, null, 2));
  process.exit(0);
}

const userRef = db.collection('users').doc(authUser.uid);
const existingDoc = await userRef.get();

if (existingDoc.exists) {
  console.error(`Firestore users/${authUser.uid} already exists. Refusing to overwrite it.`);
  process.exit(1);
}

const matchingEmailDocsByLower = await db.collection('users')
  .where('emailLower', '==', email)
  .limit(5)
  .get();
const matchingEmailDocsByEmail = await db.collection('users')
  .where('email', '==', email)
  .limit(5)
  .get();
const matchingEmailDocs = [
  ...matchingEmailDocsByLower.docs,
  ...matchingEmailDocsByEmail.docs
].filter((doc, index, docs) => docs.findIndex(candidate => candidate.id === doc.id) === index);

if (matchingEmailDocs.length > 0) {
  console.error('A Firestore user with this email already exists:');
  for (const doc of matchingEmailDocs) {
    console.error(`  users/${doc.id}`);
  }
  console.error('Resolve that duplicate before creating a UID-based profile.');
  process.exit(1);
}

const displayName = name || authUser.displayName || '';
const providerIds = authUser.providerData.map(provider => provider.providerId);

const userDoc = {
  displayName,
  email,
  emailLower: email,
  name: displayName,
  phone: phone || '',
  role,
  authProvider: providerIds.includes('google.com') ? 'google' : 'email',
  providerIds,
  createdAt: authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime) : FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  lastLogin: authUser.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime) : null,
  disabled: authUser.disabled
};

await userRef.set(userDoc);

const existingClaims = authUser.customClaims || {};
await auth.setCustomUserClaims(authUser.uid, {
  ...existingClaims,
  role
});

console.log(JSON.stringify({
  action: 'created-firestore-user',
  path: userRef.path,
  uid: authUser.uid,
  email,
  role,
  displayName
}, null, 2));
