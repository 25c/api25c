/*!
 * Rails integration helpers.
 */

var crypto = require('crypto');

/**
 * Signs data in the same way as the default SignedCookieJar implementation in Rails.
 */
exports.sign = function(val, secret){
  return val + '--' + crypto
    .createHmac('sha1', secret)
    .update(val)
    .digest('hex');
};

/**
 * Validates the signature of the signed data.
 */
exports.unsign = function(val, secret){
  var str = val.slice(0,val.lastIndexOf('--'));
  return exports.sign(str, secret) == val
    ? str
    : false;
};

/**
 * Parses and decodes Rails signed session store cookies.
 */
exports.parseSignedCookies = function(obj, secret){
  var ret = {};
  Object.keys(obj).forEach(function(key){
    var val = obj[key]
      , signed = exports.unsign(val, secret);

    if (signed) {
			var buffer = new Buffer(signed, 'base64');
      ret[key] = JSON.parse(buffer.toString('utf8'));
      delete obj[key];
    }
  });
  return ret;
};

exports.signedCookieParser = function(secret){
  return function signedCookieParser(req, res, next) {
    var cookies = req.cookies;
    if (req.railsSignedCookies) return next();

    req.signedRailsCookies = {};
    if (cookies && secret) {
      try {
        req.signedRailsCookies = exports.parseSignedCookies(cookies, secret);
      } catch (err) {
        return next(err);
      }
    }
    next();
  };
};
