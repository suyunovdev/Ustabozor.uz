const { getCollection } = require('./firestore');
const COLLECTION = 'notifications';
const notificationsRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, notificationsRef };
