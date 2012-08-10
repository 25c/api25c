try {
    var siteConfig = require('../config');
} catch (e) {
  // throw e;
    throw new Error('Could not load site config.');
}

module.exports = siteConfig;
