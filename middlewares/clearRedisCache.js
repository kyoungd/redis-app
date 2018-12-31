const { clearCache } = require('../services/redis-cache');

module.exports = async (req, res, next) => {
  await next();   // route handler runs first.  This runs after the route app.

  clearCache(req.user.id);
};
