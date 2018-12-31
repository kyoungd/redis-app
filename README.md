# AdvancedNodeStarter
Starting project for a course on Advanced Node @ Udemy

# REDIS - clear it (start node client)
node
    const redis = require('redis');
    const redisUrl = 'redis://127.0.0.1:6379';
    const client = redis.createClient(redisUrl);
    client.flushall();
