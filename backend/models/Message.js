const { getCollection } = require('./firestore');
const COLLECTION = 'messages';
const messagesRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, messagesRef };
