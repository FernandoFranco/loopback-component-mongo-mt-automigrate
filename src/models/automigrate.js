'use strict';

module.exports = function (Automigrate) {
  Automigrate.observe('before save', (context, next) => {
    if (context.instance) {
      context.instance.updated = new Date();
    } else {
      context.data.updated = new Date();
    }
    next();
  });
};
