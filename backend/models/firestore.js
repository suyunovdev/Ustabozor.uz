const { getDb } = require('../config/db');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const getCollection = (name) => getDb().collection(name);

// 5 daqiqa ichida heartbeat kelmasa — offline hisoblanadi
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000;

const computeOnlineStatus = (data) => {
    if (!data.lastSeen) return false;
    return Date.now() - new Date(data.lastSeen).getTime() < ONLINE_TIMEOUT_MS;
};

const docToObj = (doc) => {
    if (!doc.exists) return null;
    const data = doc.data();
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
        if (value instanceof Timestamp) {
            converted[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && value._seconds !== undefined) {
            converted[key] = new Date(value._seconds * 1000).toISOString();
        } else {
            converted[key] = value;
        }
    }
    // isOnline ni lastSeen asosida qayta hisoblash — stored boolean'ga ishonmaslik
    converted.isOnline = computeOnlineStatus(converted);
    return { _id: doc.id, id: doc.id, ...converted };
};

const queryToArray = (snapshot) => {
    return snapshot.docs.map(docToObj);
};

const withTimestamps = (data) => ({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
});

const withUpdatedAt = (data) => ({
    ...data,
    updatedAt: FieldValue.serverTimestamp()
});

const populateUsers = async (userIds, fields = ['name', 'surname', 'avatar', 'phone', 'rating']) => {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return {};
    const usersCol = getCollection('users');
    const refs = unique.map(id => usersCol.doc(id));
    const docs = await getDb().getAll(...refs);
    const map = {};
    docs.forEach(doc => {
        if (doc.exists) {
            const data = doc.data();
            map[doc.id] = { _id: doc.id, id: doc.id };
            fields.forEach(f => { map[doc.id][f] = data[f]; });
        }
    });
    return map;
};

module.exports = {
    getCollection,
    docToObj,
    queryToArray,
    withTimestamps,
    withUpdatedAt,
    populateUsers,
    FieldValue,
    Timestamp
};
