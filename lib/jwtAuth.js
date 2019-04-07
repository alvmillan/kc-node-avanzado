'use strict';

const jwt = require('jsonwebtoken');

module.exports = function() {
  return function(req, res, next) {
    let token = req.body.token || req.query.token || req.get('Authorization')
    
    if (!token) {
      const err = new Error('no token provided');
      return res.send(401, { success: false, error: err.message})
    }

    if (token.startsWith('Bearer ')) {
      // Remove Bearer from string
      token = token.slice(7, token.length).trimLeft();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.send(401, { success: false, error: err.message})
        }
        next(err);
        return;
      }
      req.apiUserId = payload._id;
      next();
    }); 
  };
}
