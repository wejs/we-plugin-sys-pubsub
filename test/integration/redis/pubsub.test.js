const assert = require('assert'),
  helpers = require('we-test-tools').helpers,
  path = require('path'),
  testTools = require('we-test-tools'),
  We = require('we-core');

const RedisPubSub = require('../../../lib/pubsub/redis');

let _, http, we, async;

function makeRedisPubSub(cb) {
  we = new We({ bootstrapMode: 'test' });

  testTools.init({}, we);

  we.bootstrap({
    port: 11111,
    // disable access log
    enableRequestLog: false,
    sysPubsub: {
      serviceName: 'redis',
      redisURL: 'redis://localhost:26479/1',
      rabbitmqURL: null
    },
    themes: {}
  }, (err)=> {
    let r = new RedisPubSub(we);
    r.init(()=> {
      cb(err, r);
    });
  });
}

describe('PUBSUB:REDIS', function() {
  // prepare we.js core and load app features:
  before(function (callback) {
    this.slow(100);

    we = new We({ bootstrapMode: 'test' });

    testTools.init({}, we);

    we.bootstrap({
      port: 11111,
      // disable access log
      enableRequestLog: false,
      sysPubsub: {
        serviceName: 'redis',
        redisURL: 'redis://localhost:26479/1',
        rabbitmqURL: null
      },
      themes: {}
    }, callback);
  });

// start the server:
before(function (callback) {
  we.startServer(callback);
});

  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    _ = we.utils._;
    async = we.utils.async;
    return done();
  });

  afterEach(function() {
  });

  it('Should notify update to 3 watchers', function (done) {
    this.slow(2000);
    this.timeout(3000);

    const eventName = 'system-settings';

    const ws = Array(6).fill(0);

    async.eachOfSeries(ws, (w, key, next)=> {
      makeRedisPubSub( (err, r)=> {
        if (err) throw err;
        ws[key] = r;
        next();
      });
    }, ()=> {
      async.eachOfSeries(ws, (w, key, next)=> {
        w.uid = key;

        // use setTimeout for wait for connection:
        setTimeout(()=> {
          w.subscribe(eventName, function(data) {
            w.run = data;
          });

          next();
        }, 50);

      }, (err)=>{
        assert(!err, 'Should not return an error');

        ws[2].publish(eventName, { id: '123' });

        setTimeout(()=> {
          for (let i = 0; i < ws.length; i++) {
            assert(ws[i].run, 'Should run '+i+'º subscriber');
            assert.equal(ws[i].run.id, '123', 'Should run ' + i + 'º subscriber');
          }

          done();
        }, 1000);
      });
    });

  });
});
