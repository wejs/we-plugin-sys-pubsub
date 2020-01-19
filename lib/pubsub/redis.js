function RedisPubSub(we) {
  this.we = we;
  this.redis = require('redis');
  this.key = we.config.hostname + 'DBSS';
  this.configWatcher = null;

  this.redisSubscribers = {};
}

RedisPubSub.prototype = {
  client: null,
  subscriber: null,
  prefix: 'SPS:',

  /**
   * Initializer
   *
   * @param  {Function} cb Callback]
   */
  init(cb) {
    const we = this.we;
    const self = this;

    we.utils.async.series([
      function (done) {
        self.createRedisConnection(done);
      },
      function (done) {
        we.hooks.trigger('sys-pubsub:started', we, done);
      }
    ], cb);
  },

  subscribe(eventName, fn) {
    const redisEventName = this.prefix + eventName;
    this.we.events.on(redisEventName, fn);
    this._subscribeOnRedis(eventName);
  },

  publish(eventName, data) {
    if(!eventName) throw new Error('eventName is required');
    const redisEventName = this.prefix + eventName;
    this.client.publish(redisEventName, JSON.stringify(data));
  },

  _subscribeOnRedis(eventName) {
    const redisEventName = this.prefix + eventName;
    // only subscribe on redis one time:
    if (this.redisSubscribers[redisEventName]) return;
    // only subscribe one time
    this.subscriber.subscribe(redisEventName);
    this.redisSubscribers[redisEventName] = true;
  },

  createRedisConnection(done) {
    const cfg = this.we.config.sysPubsub;
    const self = this;

    this.client = this.redis.createClient({
      url: cfg.redisURL
    });
    this.subscriber = this.redis.createClient({
      url: cfg.redisURL
    });

    this.subscriber.on('message', function(){
      self.onReceiveRedisMessage(...arguments);
    });

    done();
  },

  onReceiveRedisMessage(channel, message) {
    const events = this.we.events;
    const log = this.we.log;

    if (this.redisSubscribers[channel]) {
      log.verbose('sys-pubsub:redis:message:', {
        channel, message
      });
      const data = JSON.parse(message);
      // Send to app subscribers:
      events.emit(channel, data);
    }
  }
};

module.exports = RedisPubSub;