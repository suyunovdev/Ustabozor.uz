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

        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: storageBucket || undefined
        });

        db = getFirestore(admin.app(), 'default');

        // Bucket ni aniq nom bilan yaratish
        if (storageBucket) {
            try {
                bucket = admin.storage().bucket(storageBucket);
                console.log('Storage bucket initialized:', storageBucket);
            } catch (e) {
                console.error('Storage bucket init error:', e.message);
                bucket = null;
            }
        } else {
            console.warn('WARNING: FIREBASE_STORAGE_BUCKET env variable is not set! File uploads will not work.');
            bucket = null;
        }

        db.settings({ ignoreUndefinedProperties: true, preferRest: true });

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error(`Firebase initialization error: ${error.message}`);
        console.log('Server davom etmoqda Firebase\'siz...');
    }
};

const getDb = () => db;
const getBucket = () => bucket;

module.exports = { initializeFirebase, getDb, getBucket };
