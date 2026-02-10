const { getCollection } = require('./firestore');
const COLLECTION = 'reports';
const reportsRef = () => getCollection(COLLECTION);
module.exports = { COLLECTION, reportsRef };
