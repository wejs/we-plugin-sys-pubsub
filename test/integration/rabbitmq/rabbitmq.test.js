const assert = require('assert'),
  testTools = require('we-test-tools'),
  We = require('we-core');

const RabbitmqPubSub = require('../../../lib/pubsub/rabbitmq');

let we, async;

function makeRabbitmqPubSub(cb) {
  we = new We({ bootstrapMode: 'test' });

  testTools.init({}, we);

  we.bootstrap({
    port: 11111,
    // disable access log
    enableRequestLog: false,
    sysPubsub: {
      serviceName: 'rabbitmq',
      redisURL: null,
      rabbitmqURL: 'amqp://rabbitmq:rabbitmq@localhost:26477'
    },
    themes: {}
  }, (err)=> {
    if (err) return cb(err);
    let r = new RabbitmqPubSub(we);
    r.init((err)=> {
      cb(err, r);
    });
  });
}

describe('PUBSUB:RABITMQ', function() {
  it('Should notify update to 6 watchers', function (done) {
    this.slow(2000);
    this.timeout(3000);

    const eventName = 'system-settings2';

    const ws = Array(7).fill(0);

    async.eachOfSeries(ws, (w, key, next)=> {
      makeRabbitmqPubSub( (err, r)=> {
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
            console.log('xxx', w.uid, data);
            w.run = data;
          });

          next();
        }, 100);

      }, (err)=>{
        assert(!err, 'Should not return an error');

        ws[1].publish(eventName, { id: '321' });

        setTimeout(()=> {
          for (let i = 0; i < ws.length; i++) {
            assert(ws[i].run, 'Should run '+i+'º subscriber');
            assert.equal(ws[i].run.id, '321', 'Should run ' + i + 'º subscriber');
          }

          done();
        }, 2000);
      });
    });

  });
});
