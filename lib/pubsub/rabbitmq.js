function RabbitmqPubSub(we) {
  this.we = we;
  this.amqp = require('amqplib/callback_api');
  this.serviceSubscribers = {};
  this.key = we.config.hostname + 'DBSS';
}

RabbitmqPubSub.prototype = {
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
        self.createConnection(done);
      },
      function (done) {
        we.hooks.trigger('sys-pubsub:started', we, done);
      },
      function (done) {
        we.hooks.trigger('sys-pubsub:rabbitmq:started', we, done);
      }
    ], cb);
  },

  subscribe(eventName, fn) {
    const serviceEventName = this.prefix + eventName;
    console.log('<sub>', serviceEventName);
    this.we.events.on(serviceEventName, fn);
    this._subscribeOnService(eventName);
  },

  publish(eventName, data) {
    if(!eventName) throw new Error('eventName is required');
    const serviceEventName = this.prefix + eventName;
    this.channel.assertExchange(serviceEventName, 'fanout', {
      durable: false
    });
    this.channel.publish(serviceEventName, '', new Buffer(JSON.stringify(data)));
    // notify to emmiter too:
  },

  _subscribeOnService(eventName) {
    const self = this;
    const serviceEventName = this.prefix + eventName;
    const events = this.we.events;
    // only subscribe one time:
    if (this.serviceSubscribers[serviceEventName]) return;
    this.serviceSubscribers[serviceEventName] = true;

    this.channel.assertExchange(serviceEventName, 'fanout', {
      durable: false
    });

    this.channel.assertQueue('', {
      exclusive: true
    }, function(err, q) {
      self.channel.bindQueue(q.queue, serviceEventName, '');
      self.channel.consume(q.queue, function (msg) {
        console.log('[x] Received %s', msg.content.toString());
        const data = JSON.parse(msg.content.toString());
        console.log('<emig>', serviceEventName, data);
        events.emit(serviceEventName, data);
      }, { noAck: true });

    });
  },

  createConnection(done) {
    const cfg = this.we.config.sysPubsub;
    const self = this;

    this.amqp.connect(cfg.rabbitmqURL, function(err, connection) {
      if (err) return done(err);

      self.connection = connection;

      connection.createChannel(function(err, channel) {
        if (err) return done(err);
        self.channel = channel;
        done();
      });
    });
  }
};

module.exports = RabbitmqPubSub;