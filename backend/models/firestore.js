const { getDb } = require('../config/db');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const getCollection = (name) => getDb().collection(name);

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
