// This function 
// 
const mongoose = require('mongoose');
const redis = require('redis');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
const util = require('util');
// promisify - takes any function that returns a call-back (like client.get) and return it as a promise.
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

// use function, not arrow.  Otherwise, 'this' is not available.  overwite mongoose.Query.prototype.exec().
mongoose.Query.prototype.exec = async function() {
  if (!this.useCache)
    return exec.apply(this, arguments);

  console.log('I AM ABOUT TO RUN A QUERY');
  console.log(this.getQuery());   // get the mongoose query options as an hash key
  console.log(this.mongooseCollection.name);  // get the mongoose collection name
  const key = JSON.stringify(
      Object.assign({}, this.getQuery(), 
      {collection: this.mongooseCollection.name})
  ) // create a key object

  // if cached data in redis, return it.
  const result = await client.hget(this.hashKey, key);
  if (result) {
    console.log('SERVING FROM REDIS', result);
    const doc = JSON.parse(result);
    // doc is an ordinary javascript object.  but it isn't mongoose model instance.
    // convert the javascript object to mongoose model instance.

    // is this single object {} or array of object [{}, {}] => { model({}) }, or [{model({})}, {model({})}]
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  console.log('SERVING FROM MONGODB');
  // if no, search DB and return the result
  const blogs = await exec.apply(this, arguments);
  client.hset(this.hashKey, key, JSON.stringify(blogs));
  return blogs;
}

// only mongoose queries with .cached extension will be saved to redis.
// options is used to define the top-level key in the redis.  
// part of the caching strategy.
mongoose.Query.prototype.cached = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');
  return this;    // this make this function chainable.
}

function clearCache(hashKey) {
  client.del(JSON.stringify(hashKey));
}

module.exports = {
  clearCache
}