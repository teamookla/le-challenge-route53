'use strict';
// store domain name, zone ID and digest for each dns record here to share
// between method calls

const store = new Map();

module.exports = {
  get: function (domain) {
    const result = store.get(domain);
    if (result) {
      return Promise.resolve(result);
    }
    return Promise.reject(new Error(`le-challenge-route53.get(${domain}) failed: no result`));
  },
  set: function (domain, payload) {
    if (!domain) {
      return Promise.reject(new Error(`le-challenge-route53.set: domain is required`));
    }
    if (!payload) {
      return Promise.reject(new Error(`le-challenge-route53.set(${domain}): payload is required`));
    }
    return Promise.resolve(store.set(domain, payload));
  },
  remove: function (domain) {
    const result = store.get(domain);
    if (result) {
      return Promise.resolve(store.delete(domain));
    }
    return Promise.resolve();
  }
};
