const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

let db;
let bucket;

const initializeFirebase = () => {
    try {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        } else {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
                || './config/serviceAccountKey.json';
            serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });

        db = getFirestore(admin.app(), 'default');
        bucket = admin.storage().bucket();

        db.settings({ ignoreUndefinedProperties: true, preferRest: true });

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error(`Firebase initialization error: ${error.message}`);
        console.log('Server davom etmoqda Firebase\'siz...');
        console.log('serviceAccountKey.json faylini backend/config/ papkasiga qo\'ying');
    }
};

const getDb = () => db;
const getBucket = () => bucket;

module.exports = { initializeFirebase, getDb, getBucket };
