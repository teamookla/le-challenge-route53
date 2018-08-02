'use strict';

const _ = require('lodash');
const fs = require('fs');
const Route53Client = require('@ookla/route53-client').default;

const {
  encrypt,
  getChallengeDomain,
  parseHrtimeToSeconds,
} = require('./lib/helpers');

const store = require('./lib/store');

const defaults = {
  debug: false,
  delay: 2e4,
  acmeChallengeDns: '_acme-challenge.',
  log(debug, ...args) {
    if (debug) console.debug.call(console, '[le-challenge-route53]', ...args);
  },
};

class Challenge {
  constructor(options) {
    const zone = options.zone;
    if (typeof zone !== 'string'){
      throw new Error('Expected `options.zone` to be of type String');
    }
    _.merge(this, defaults, options);

    if (!this.route53) {
       this.route53 = new Route53Client();
      // AWS authentication is loaded from config file if its path is provided and
      // the file exists.
      if (options.AWSConfigFile && fs.existsSync(options.AWSConfigFile)){
        route53.getConfig().loadFromPath(options.AWSConfigFile);
      }
    }

    // TODO: le-challenge-route53 currently supports only one hosted zone,
    // passed as an option. see https://github.com/thadeetrompetter/le-challenge-route53/issues/1
    this.hostedZone = this.route53.getZoneIDByName(zone);
  }

  getOptions() {
    return Object.assign({}, defaults);
  }

  set(_opts, domain, token, keyAuthorization, cb) {
    const keyAuthDigest = encrypt(keyAuthorization);
    const prefixedDomain = getChallengeDomain(this.acmeChallengeDns, domain);
    return this.hostedZone.then(id => {
      const params = this.route53.upsertPayload('TXT', prefixedDomain, `"${keyAuthDigest}"`);
      return this.route53.changeResourceRecordSets(id, params)
        .then(() => {
          return store.set(domain, {
            id,
            domain,
            value: keyAuthDigest
          });
        });
      })
    .asCallback(cb);
  }

  /* eslint-disable no-unused-vars */
  get(_opts, domain, token, cb) { /* Not to be implemented */ }
  /* eslint-enable no-unused-vars */

  remove(_opts, domain, token, cb) {
    store.get(domain)
      .then(({id, domain, value}) => {
        const prefixedDomain = getChallengeDomain(this.acmeChallengeDns, domain);
        const params = this.route53.deletePayload('TXT', prefixedDomain, `"${value}"`);
        return this.route53.changeResourceRecordSets(id, params)
          .then(() => {
            return store.remove(domain)
          });
      })
      .asCallback(cb);
  }
}

module.exports = Challenge;
