const { getCollection } = require('./firestore');
const COLLECTION = 'users';
const usersRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, usersRef };
