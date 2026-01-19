import admin from "firebase-admin";
import fs from "fs";
import serviceAccount from "./credentials.json" with { type: "json" };

// 1. Initialize PROD app and get Firestore BEFORE setting emulator env var
const prodApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
}, 'prod');
const prodDb = prodApp.firestore(); // Get this BEFORE setting emulator host!

// 2. Initialize EMULATOR app to write data
// Ensure your emulator is running on port 8080!
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const localApp = admin.initializeApp({
    projectId: serviceAccount.project_id
}, 'local');
const localDb = localApp.firestore();

async function migrate() {
    // Debug: List all collections in prod
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Listing all root collections in prod...');
    try {
        const rootCollections = await prodDb.listCollections();
        console.log('Found collections:', rootCollections.map(c => c.id));

        // Try reading a specific document to test permissions
        const testDoc = await prodDb.collection('users').limit(1).get();
        console.log('Test read users:', testDoc.size, 'docs');
    } catch (err) {
        console.error('Error accessing Firestore:', err.message);
    }

    // List the collections you want to copy
    const collections = [
        'users',
        'teams',
        'events',
        'kids',
        'forms',
        'form_submissions',
        'form_assignments',
        'eventParticipants',
        'vehicles',
        'reports',
        'backups'
    ];

    for (const collName of collections) {
        console.log(`Copying ${collName}...`);
        const snapshot = await prodDb.collection(collName).get();

        const batch = localDb.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const ref = localDb.collection(collName).doc(doc.id);
            batch.set(ref, doc.data());
            count++;
        });

        await batch.commit();
        console.log(`Copied ${count} docs to ${collName}`);
    }
}

migrate();
