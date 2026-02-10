const { getCollection } = require('./firestore');
const COLLECTION = 'chats';
const chatsRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, chatsRef };
