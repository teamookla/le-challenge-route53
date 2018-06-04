'use strict';

const crypto = require('crypto');
const base64url = require('base64-url');
const numeral = require('numeral');

// TODO: document and test
function mergeOptions(defaults, options) {
  return Object.assign(defaults, options);
}
exports.mergeOptions = mergeOptions;

// TODO: document and test
function encrypt(key='') {
  return base64url.encode(
    crypto.createHash('sha256')
      .update(key)
      .digest()
    );
}
exports.encrypt = encrypt;

/**
 * TODO
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
exports.verifyParams = (params) => params.every(param => Boolean(param));

/**
 * TODO
 * @param  {[type]} prefix [description]
 * @param  {[type]} domain [description]
 * @return {[type]}        [description]
 */
exports.getChallengeDomain = (prefix, domain) => `${prefix}${domain}`;

exports.parseHrtimeToSeconds = function parseHrtimeToSeconds(hrtime) {
  return numeral(hrtime[0] + (hrtime[1] / 1e9)).format('0,0.[000]');
}
