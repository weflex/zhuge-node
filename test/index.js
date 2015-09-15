'use strict';

const assert = require('assert');
const Analytics = require('..');
const async = require('async');
const server = require('./server');

var a;
var noop = function(){};
var context = {
  library: {
    name: 'zhuge-node',
    version: require('../package.json').version
  }
};

describe('Analytics', function(){
  before(function(done){
    async.series([
      function(cb){
        server.proxy.listen(server.ports.proxy, cb);
      },
      function(cb){
        server.app
          .post('/open/v1/event_statis_srv/upload_event', server.fixture)
          .listen(server.ports.source, cb);
      }
    ], done);
  });

  beforeEach(function(){
    a = Analytics('key', {
      host: 'http://localhost:4063',
      flushAt: Infinity,
      flushAfter: Infinity
    });
  });

  it('should expose a constructor', function(){
    assert.equal('function', typeof Analytics);
  });

  it('should require a write key', function(){
    assert.throws(Analytics, error("You must pass your Segment project's write key."));
  });

  it('should not require the new keyword', function(){
    assert(a instanceof Analytics);
  });

  it('should create a queue', function(){
    assert.deepEqual(a.queue, []);
  });

  it('should set default options', function(){
    var a = Analytics('key');
    assert.equal(a.writeKey, 'key');
    assert.equal(a.host, 'https://apipool.zhugeio.com');
    assert.equal(a.flushAt, 20);
    assert.equal(a.flushAfter, 10000);
  });

  it('should take options', function(){
    var a = Analytics('key', {
      host: 'a',
      flushAt: 1,
      flushAfter: 2,
      proxy: 'http://localhost:9001'
    });
    assert.equal(a.host, 'a');
    assert.equal(a.flushAt, 1);
    assert.equal(a.flushAfter, 2);
    assert.equal(a.proxy, 'http://localhost:9001');
  });

  it('should keep the flushAt option above zero', function(){
    var a = Analytics('key', { flushAt: 0 });
    assert.equal(a.flushAt, 1);
  });

  describe('#enqueue', function(){
    it('should add a message to the queue', function(){
      var date = parseInt(Date.now() / 1000);
      a.enqueue('type', { timestamp: date }, noop);

      assert.deepEqual(a.queue[0], {
        message: {
          cuid: undefined,
          eid: undefined,
          et: 'type',
          ts: date, 
          pr: { context: context },
        },
        callback: noop
      });
    });

    it('should not modify the original message', function(){
      var message = { event: 'test' };
      a.enqueue('type', message, noop);
      assert(!message.hasOwnProperty('timestamp'));
    });

    it('should flush the queue if it hits the max length', function(done){
      a.flushAt = 1;
      a.flushAfter = null;
      a.flush = done;
      a.enqueue('type', {});
    });

    it('should flush after a period of time', function(done){
      a.flushAt = Infinity;
      a.flushAfter = 1;
      a.flush = done;
      a.enqueue('type', {});
    });

    it('should reset an existing timer', function(done){
      var i = 0;
      a.flushAt = Infinity;
      a.flushAfter = 1;
      a.flush = function(){ i++; };
      a.enqueue('type', {});
      a.enqueue('type', {});
      setTimeout(function(){
        assert.equal(1, i);
        done();
      }, 1);
    });

    it('should extend the given context', function(){
      a.enqueue('type', { event: 'test', context: { name: 'travis' } }, noop);
      assert.deepEqual(a.queue[0].message.pr.context, {
        library: {
          name:'zhuge-node',
          version: require('../package.json').version
        },
        name: 'travis'
      });
    });
  });

  describe('#flush', function(){
    it('should not fail when no items are in the queue', function(done){
      a.flush(done);
    });

    it('should send a batch of items', function(done){
      a.flushAt = 2;
      enqueue(a, [1, 2, 3]);
      a.flush(function(err, data){
        if (err) return done(err);
        assert.deepEqual(data.data, [1, 2]);
        assert(typeof data.ts === 'number');
        done();
      });
    });

    it('should proxy', function(done) {
      a = Analytics('key', {
        host: 'http://localhost:4063',
        flushAt: Infinity,
        flushAfter: Infinity,
        proxy: 'http://localhost:4064'
      });
      a.enqueue('type', { event: 'test' }, noop);
      a.flush(function(err, data){
        // our proxy turns all responses into 408/errs
        assert(err);
        done();
      });
    });

    it('should callback with an HTTP error', function(done){
      enqueue(a, ['error']);
      a.flush(function(err, data){
        assert(err);
        assert.equal(err.message, 'error');
        done();
      });
    });
  });

  describe('#identify', function(){
    it('should enqueue a message', function(){
      var date = parseInt(Date.now() / 1000);
      a.identify({ userId: 'id', timestamp: date });
      assert.deepEqual(a.queue[0].message, {
        et: 'idf',
        eid: undefined,
        cuid: 'id',
        ts: date,
        pr: { context: context }
      });
    });

    it('should validate a message', function(){
      assert.throws(a.identify, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.identify({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });
  });

  // TODO(Yorkie): Not implemented
  // describe('#group', function(){
  //   it('should enqueue a message', function(){
  //     var date = new Date();
  //     a.group({ groupId: 'group', userId: 'user', timestamp: date });
  //     assert.deepEqual(a.queue[0].message, {
  //       type: 'group',
  //       userId: 'user',
  //       groupId: 'group',
  //       timestamp: date,
  //       context: context
  //     });
  //   });

  //   it('should validate a message', function(){
  //     assert.throws(a.group, error('You must pass a message object.'));
  //   });

  //   it('should require a userId or anonymousId', function(){
  //     assert.throws(function(){
  //       a.group({});
  //     }, error('You must pass either an "anonymousId" or a "userId".'));
  //   });

  //   it('should require a groupId', function(){
  //     assert.throws(function(){
  //       a.group({ userId: 'id' });
  //     }, error('You must pass a "groupId".'));
  //   });
  // });

  describe('#track', function(){
    it('should enqueue a message', function(){
      var date = parseInt(Date.now() / 1000);
      a.track({ userId: 'id', event: 'event', timestamp: date });
      assert.deepEqual(a.queue[0].message, {
        et: 'cus',
        eid: 'event',
        cuid: 'id',
        ts: date,
        pr: { 'context': context }
      });
    });

    it('should handle a user ids given as a number', function(){
      var date = parseInt(Date.now() / 1000);
      a.track({ userId: 1, event: 'jumped the shark', timestamp: date });
      assert.deepEqual(a.queue[0].message, {
        cuid: 1,
        eid: 'jumped the shark',
        et: 'cus',
        ts: date,
        pr: { 'context': context }
      })
    });

    it('should validate a message', function(){
      assert.throws(a.track, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.track({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });

    it('should require an event', function(){
      assert.throws(function(){
        a.track({ userId: 'id' });
      }, error('You must pass an "event".'));
    });
  });

  describe('#page', function(){
    it('should enqueue a message', function(){
      var date = parseInt(Date.now() / 1000);
      a.page({ 
        userId: 'id', 
        name: 'name',
        category: 'category',
        timestamp: date 
      });
      assert.deepEqual(a.queue[0].message, {
        et: 'cus',
        eid: undefined,
        cuid: 'id',
        ts: date,
        pr: {
          name: 'name',
          category: 'category',
          context: context
        }
      });
    });

    it('should validate a message', function(){
      assert.throws(a.page, error('You must pass a message object.'));
    });

    it('should require a userId or anonymousId', function(){
      assert.throws(function(){
        a.page({});
      }, error('You must pass either an "anonymousId" or a "userId".'));
    });
  });

  // TODO(Yorkie): Not implemented
  // describe('#alias', function(){
  //   it('should enqueue a message', function(){
  //     var date = new Date();
  //     a.alias({ previousId: 'previous', userId: 'id', timestamp: date });
  //     assert.deepEqual(a.queue[0].message, {
  //       type: 'alias',
  //       previousId: 'previous',
  //       userId: 'id',
  //       timestamp: date,
  //       context: context
  //     });
  //   });

  //   it('should validate a message', function(){
  //     assert.throws(a.alias, error('You must pass a message object.'));
  //   });

  //   it('should require a userId', function(){
  //     assert.throws(function(){
  //       a.alias({});
  //     }, error('You must pass a "userId".'));
  //   });

  //   it('should require a previousId', function(){
  //     assert.throws(function(){
  //       a.alias({ userId: 'id' });
  //     }, error('You must pass a "previousId".'));
  //   });
  // });
});

/**
 * Create a queue with `messages`.
 *
 * @param {Analytics} a
 * @param {Array} messages
 * @return {Array}
 */

function enqueue(a, messages){
  a.queue = messages.map(function(msg){
    return {
      message: msg,
      callback: noop
    };
  });
}

/**
 * Assert an error with `message` is thrown.
 *
 * @param {String} message
 * @return {Function}
 */

function error(message){
  return function(err){
    return err.message == message;
  };
}
