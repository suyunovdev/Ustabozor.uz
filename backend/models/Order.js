const { getCollection } = require('./firestore');
const COLLECTION = 'orders';
const ordersRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, ordersRef };
