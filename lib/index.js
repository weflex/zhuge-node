'use strict';

const assert = require('assert');
const debug = require('debug')('analytics-node');
const noop = function(){};
const request = require('superagent');
require('superagent-proxy')(request);
require('superagent-retry')(request);
const type = require('component-type');
const join = require('join-component');
const uid = require('uid');
const version = require('../package.json').version;
const extend = require('lodash').extend;

global.setImmediate = global.setImmediate || process.nextTick.bind(process);

/**
 * Expose an `Analytics` client.
 */

module.exports = Analytics;

/**
 * Initialize a new `Analytics` with your Segment project's `writeKey` and an
 * optional dictionary of `options`.
 *
 * @param {String} writeKey
 * @param {Object} options (optional)
 *   @property {Number} flushAt (default: 20)
 *   @property {Number} flushAfter (default: 10000)
 *   @property {String} host (default: 'https://api.segment.io')
 *   @property {String|Object} proxy (default: null)
 */

function Analytics (writeKey, options) {
  if (!(this instanceof Analytics)) {
    return new Analytics(writeKey, options);
  }
  assert(writeKey, 'You must pass your Segment project\'s write key.');
  options = options || {};
  this.queue = [];
  if (typeof writeKey === 'object') {
    // accept the object like { 'appid': 'APPID', 'secret': 'SECRET' }
    this.writeKey = new Buffer(`${writeKey.appid}:${writeKey.secret}`).toString('base64');
  } else {
    this.writeKey = writeKey;
  }
  this.host = options.host || 'https://apipool.zhugeio.com';
  this.flushAt = Math.max(options.flushAt, 1) || 20;
  this.flushAfter = options.flushAfter || 10000;
  this.proxy = options.proxy || null;
}

/**
 * Send an identify `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.identify = function (message, fn) {
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  this.enqueue('idf', message, fn);
  return this;
};

/**
 * Send a group `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.group = function (message, fn) {
  throw new Error('not implemented');
};

/**
 * Send a track `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.track = function (message, fn) {
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  assert(message.event, 'You must pass an "event".');
  this.enqueue('cus', message, fn);
  return this;
};

/**
 * Send a page `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.page = function (message, fn) {
  validate(message);
  assert(message.anonymousId || message.userId, 'You must pass either an "anonymousId" or a "userId".');
  assert(message.category, 'category must be required at pageview');
  // set name and category
  message.properties = message.properties || {};
  message.properties.category = message.category || message.properties.category;
  message.properties.name = message.name || message.properties.name;
  this.enqueue('cus', message, fn);
  return this;
};

/**
 * Send an alias `message`.
 *
 * @param {Object} message
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.alias = function (message, fn) {
  throw new Error('not implemented');
};

/**
 * Flush the current queue and callback `fn(err, batch)`.
 *
 * @param {Function} fn (optional)
 * @return {Analytics}
 */

Analytics.prototype.flush = function (fn) {
  fn = fn || noop;
  if (!this.queue.length) return setImmediate(fn);

  let items = this.queue.splice(0, this.flushAt);
  let fns = items.map(function(_){ return _.callback; });
  let batch = items.map(function(_){ return _.message; });

  let data = {
    // Unix/Epoch timestamp
    ts: parseInt(Date.now() / 1000),
    cuid: batch[0].userId,
    ak: this.appKey,
    sdk: 'web',
    data: batch
  };

  debug('flush: %o', data);

  let req = request
    .post(this.host + '/open/v1/event_statis_srv/upload_event');

  if (this.proxy) {
    req = req.proxy(this.proxy);
  }

  req
    .auth(this.writeKey, '')
    .retry(3)
    .send(data)
    .end(function(err, res){
      err = err || error(res);
      fns.push(fn);
      fns.forEach(function(fn){ fn(err, data); });
      debug('flushed: %o', data);
    });
};

/**
 * Add a `message` of type `type` to the queue and check whether it should be
 * flushed.
 *
 * @param {String} type
 * @param {Object} msg
 * @param {Functino} fn (optional)
 * @api private
 */

Analytics.prototype.enqueue = function (type, msg, fn) {
  fn = fn || noop;
  const message = {
    cuid: msg.userId,
    eid: msg.event,
    ts: parseInt(Date.now() / 1000),
    et: type,
    pr: msg.traits || msg.properties
  };
  message.pr.context = extend(message.pr.context || {}, {
    'library': {
      'name': 'zhuge-node',
      'version': version
    }
  });

  debug('%s: %o', type, message);
  this.queue.push({
    message: message,
    callback: fn
  });

  if (this.queue.length >= this.flushAt) this.flush();
  if (this.timer) clearTimeout(this.timer);
  if (this.flushAfter) this.timer = setTimeout(this.flush.bind(this), this.flushAfter);
};

/**
 * Validation rules.
 */

const rules = {
  anonymousId: ['string', 'number'],
  category: 'string',
  context: 'object',
  event: 'string',
  groupId: ['string', 'number'],
  integrations: 'object',
  name: 'string',
  previousId: ['string', 'number'],
  timestamp: 'date',
  ts: ['number', 'date'], // for timestamp
  userId: ['string', 'number']
};

/**
 * Validate an options `obj`.
 *
 * @param {Object} obj
 */

function validate (obj) {
  assert('object' == type(obj), 'You must pass a message object.');
  for (const key in rules) {
    const val = obj[key];
    if (!val) continue;
    let exp = rules[key];
    exp = ('array' === type(exp) ? exp : [exp]);
    const a = 'object' == exp ? 'an' : 'a';
    assert(exp.some(function(e){ return type(val) === e; }), '"' + key + '" must be ' + a + ' ' + join(exp, 'or') + '.');
  }
};

/**
 * Get an error from a `res`.
 *
 * @param {Object} res
 * @return {String}
 */

function error (res) {
  if (res.return_code === 0) return;
  const body = res.body;
  const msg = body.return_message || `${res.status} ${res.text}`;
  return new Error(msg);
}
