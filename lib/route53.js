'use strict';

const AWS = require('aws-sdk');
const R = require('ramda');
const route53 = new AWS.Route53({apiVersion: '2013-04-01'});
const { verifyParams } = require('./helpers');
const Promise = require('bluebird');
const promiseWhile = require('promise-while-loop');

// export route53 config to be able to read in authentication from file, if
// its name is provided in options
exports.route53Config = route53.config;

// Configure AWS api to return (native) promises
AWS.config.setPromisesDependency(Promise);

/**
 * Get an object payload for Route53.changeResourceRecordSets
 *
 * @param  {string} action uppercase action: CREATE or DELETE
 * @param  {string} id     route53 hosted zone id
 * @param  {string} domain domain to request certificate for
 * @param  {string} value  value for the TXT record
 * @return {object}        payload
 */
function route53Payload (action, id, domain, value) {
  if(!verifyParams(Array.from(arguments))){
    throw new TypeError('route53Payload expects action, id, domain, value');
  }
  return {
    ChangeBatch: {
      Changes: [{
        Action: action,
        ResourceRecordSet: {
          Name: domain,
          Type: 'TXT',
          TTL: 60,
          ResourceRecords: Array.of(formatValue(value))
        }
      }]
    },
    HostedZoneId: id
  };
}
exports.route53Payload = route53Payload;

// Curried versions route53Payload to use specifically for creation or deletion
// of records
exports.route53CreatePayload = R.curry(route53Payload)('CREATE');
exports.route53DeletePayload = R.curry(route53Payload)('DELETE');
exports.route53UpsertPayload = R.curry(route53Payload)('UPSERT');

/**
 * TODO
 * @param  {[type]} value [description]
 * @return {[type]}       [description]
 */
const formatValue = value => ({ Value: `"${value}"`});
exports.formatValue = formatValue;

/**
 * TODO
 * @param  {[type]} DNSName [description]
 * @return {[type]}         [description]
 */
exports.getZoneIDByName = DNSName => {
  if(typeof DNSName !== 'string'){
    return Promise.reject(new TypeError(`Expected DNSName to be of type string,
      got ${(typeof DNSName)}`));
  }
  return route53.listHostedZonesByName({ DNSName }).promise()
    .then(result => {
      // destructure to get to the id returned by listHostedZonesByName
      const { HostedZones: [ { Id: id } ] } = result;
      return id;
    });
};
/**
 * TODO
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */
const listResourceRecordSets = params => route53
  .listResourceRecordSets(params)
  .promise();
exports.listResourceRecordSets = listResourceRecordSets;

/**
 * TODO
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */

const changeResourceRecordSets = params => route53
  .changeResourceRecordSets(params)
  .promise().then((changeResult) => {
    return promiseWhile((changeStatus) => {
      return changeStatus.ChangeInfo.Status === 'PENDING';
    }, () => {
      return Promise.delay(3000).then(() =>
        route53.getChange({Id: changeResult.ChangeInfo.Id})
        .promise());
    }).then(() => {
      return changeResult;
    });
  });

exports.changeResourceRecordSets = changeResourceRecordSets;
