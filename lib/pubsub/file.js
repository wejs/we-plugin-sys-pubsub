const fs = require('fs'),
  path = require('path');

function FilePubSub(we) {
  this.we = we;
  this.folder = path.join(process.cwd(), 'files', 'tmp', 'sys-pubsub' );
}

FilePubSub.prototype = {
  prefix: 'SPSF:',

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
        self.createFolderIfNotExists(done);
      },
      function (done) {
        self._watchFolder(done);
      },
      function (done) {
        we.hooks.trigger('sys-pubsub:started', we, done);
      },
      function (done) {
        we.hooks.trigger('sys-pubsub:file:started', we, done);
      }
    ], cb);
  },

  subscribe(eventName, fn) {
    this.validData(eventName, fn);
    const safeEventName = this.buildSafeEventName(eventName);
    this.we.events.on(safeEventName, fn);
  },

  publish(eventName, data) {
    this.validData(eventName, data);
    const safeEventName = this.buildSafeEventName(eventName);
    this._updateFile(safeEventName, JSON.stringify(data));
  },

  buildSafeEventName(eventName) {
    return this.we.utils.stripTagsAndTruncate (
      this.prefix + eventName, 1000, ''
    );
  },

  validData(eventName) {
    if(!eventName) throw new Error('eventName is required');
    if(typeof eventName != 'string') throw new Error('eventName should be string');
  },

  _watchFolder(cb) {
    let previousMTime = new Date(0);
    const self = this;
    const log = this.we.log;

    fs.watch(this.folder, (event, fileName) => {
      if (fileName && fileName.startsWith(self.prefix)) {

        const filePath = path.join(self.folder, fileName);

        fs.stat(filePath, function(err, stats) {
          if (err) return log.error('we-plugin-sys-pubsub:Error on check file status:', {
            fileName,
            filePath,
            error: {
              message: err.message,
              stack: err.stack,
              code: err.code
            }
          });

          if (stats.mtime.valueOf() === previousMTime.valueOf()) {
            return;
          }

          previousMTime = stats.mtime;
          self._onFileChangedEvent(fileName, filePath);
        });
      }
    });

    cb();
  },

  _updateFile(safeEventName, data) {
    const filePath = path.join(this.folder, safeEventName);
    const log = this.we.log;
    fs.writeFile(filePath, data, {
      // flag: 'w'
    }, function(err) {
      if (err) {
        return log.error('we-plugin-sys-pubsub:Error on update or create file', {
          filePath: filePath,
          error: {
            message: err.message,
            stack: err.stack,
            code: err.code
          }
        });
      }
    });
  },

  _onFileChangedEvent(fileName, filePath) {
    const log = this.we.log;
    const events = this.we.events;

    fs.readFile(filePath, 'utf8', function(err, contents) {
      if (err) {
        return log.error('we-plugin-sys-pubsub:Error on update or create file', {
          filePath: filePath,
          error: {
            message: err.message,
            stack: err.stack,
            code: err.code
          }
        });
      }
      const data = JSON.parse(contents);
      events.emit(fileName, data);
    });
  },

  createFolderIfNotExists (cb) {
    this.we.utils.mkdirp(this.folder, cb);
  },

  createFileIfNotExists(safeEventName, cb) {
    const filePath = path.join(this.folder, safeEventName);
    fs.access(filePath, fs.F_OK, function (err) {
      if (err) {
        fs.writeFile(filePath, '', function (err) {
          if (err) return cb(err);
          cb();
        });
      } else {
        cb();
      }
    });
  }
};

module.exports = FilePubSub;
