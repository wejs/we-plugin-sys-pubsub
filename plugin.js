/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  // set plugin configs
  plugin.setConfigs({
    // Options: file, redis, rabitmq
    sysPubsub: {
      serviceName: 'file',
      redisURL: process.env.REDIS_URL,
    }
  });

  // set plugin routes
  // plugin.setRoutes({
  // });

  plugin.selectPubSubService = function(we, done) {
    const st = we.config.sysPubsub.serviceName;

    if (!st) return done();
    const Pubsub = require('./lib/pubsub/'+st);

    we.sysPubsub = new Pubsub(we);

    done();
  };

  plugin.initPubSub = function(we, done) {
    if (!we.sysPubsub) return done();
    we.sysPubsub.init(done);

    we.events.emit('we:after:init:sysPubsub', we);
  };

  plugin.hooks.on('we:after:load:plugins', plugin.selectPubSubService);
  plugin.hooks.on('we:models:ready', plugin.initPubSub);

  return plugin;
};