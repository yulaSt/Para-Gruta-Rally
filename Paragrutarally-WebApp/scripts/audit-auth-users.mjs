#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../credentials.json' with { type: 'json' };

const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function listAuthUsers() {
  const users = [];
  let nextPageToken;

  do {
    const page = await auth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return users;
}

function formatUserRow(user) {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    disabled: user.disabled,
    providers: user.providerData.map(provider => provider.providerId).join(','),
    created: user.metadata.creationTime || '',
    lastSignIn: user.metadata.lastSignInTime || ''
  };
}

const [authUsers, usersSnapshot] = await Promise.all([
  listAuthUsers(),
  db.collection('users').get()
]);

const firestoreById = new Map();
const firestoreByEmail = new Map();

for (const doc of usersSnapshot.docs) {
  const data = doc.data();
  firestoreById.set(doc.id, { id: doc.id, data });

  const email = normalizeEmail(data.emailLower || data.email);
  if (email) {
    const docs = firestoreByEmail.get(email) || [];
    docs.push({ id: doc.id, data });
    firestoreByEmail.set(email, docs);
  }
}

const authOnly = [];
const authUidMissingButEmailMatched = [];

for (const user of authUsers) {
  const byUid = firestoreById.get(user.uid);
  if (byUid) continue;

  const byEmail = firestoreByEmail.get(normalizeEmail(user.email));
  if (byEmail?.length) {
    authUidMissingButEmailMatched.push({
      auth: formatUserRow(user),
      matchingFirestoreDocs: byEmail.map(doc => ({
        id: doc.id,
        email: doc.data.email || '',
        role: doc.data.role || '',
        displayName: doc.data.displayName || doc.data.name || ''
      }))
    });
  } else {
    authOnly.push(formatUserRow(user));
  }
}

const authIds = new Set(authUsers.map(user => user.uid));
const firestoreWithoutAuth = usersSnapshot.docs
  .filter(doc => !authIds.has(doc.id))
  .map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email || '',
      role: data.role || '',
      displayName: data.displayName || data.name || ''
    };
  });

console.log(JSON.stringify({
  projectId: serviceAccount.project_id,
  totals: {
    authUsers: authUsers.length,
    firestoreUsers: usersSnapshot.size,
    authOnly: authOnly.length,
    authUidMissingButEmailMatched: authUidMissingButEmailMatched.length,
    firestoreWithoutAuth: firestoreWithoutAuth.length
  },
  authOnly,
  authUidMissingButEmailMatched,
  firestoreWithoutAuth
}, null, 2));
