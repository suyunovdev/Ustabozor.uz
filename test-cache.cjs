const cache = require('./backend/utils/cache');
console.log('Cache keys:', Object.keys(cache));
console.log('Cache prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(cache)));
console.log('deleteNamespace type:', typeof cache.deleteNamespace);
process.exit(0);
