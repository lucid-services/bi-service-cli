var _       = require('lodash');
var Promise = require('bluebird');
var Vantage = require('bi-vantage');
var service = require('bi-service');

var App        = service.App;
var AppManager = service.AppManager;
var commands   = require('./commands');


module.exports = CLI;

/**
* CLI
*
* @param {AppManager} appManager
* @param {Config} config - module
* @param {Object} [options]
* @param {Object} [options.validator] - json-inspector initialization options
* @param {String} [options.name] - app's name
* @param {Array}  [options.users]
* @param {Object} [options.users[]]
* @param {String} [options.users[].user]
* @param {String} [options.users[].pass]
* @param {String} [options.hashAlgorithm]
*
* @constructor
**/
function CLI(appManager, config, options) {
    App.call(this, appManager, config, {}, options);

    var cli = this;
    var defaults = {
        apps: [],
        users: [],
        hashAlgorithm: null
    };

    this.options = _.assign(defaults, this.options || {});

    if (!(this.appManager instanceof AppManager)) {
        throw new Error('Expected options.appManager to be an instanceof AppManager');
    }

    this.options.apps = this.appManager.apps;
    this.apps = [];
    this.server = new Vantage();
    //disable auth
    this.server.auth(function() {
        return function(args, cb) {
            return cb(void 0, true);
        };
    });
    //this.server.auth('basic', {
        //users: options.users || [],
        //hashAlgorithm: options.hashAlgorithm
    //});
    this.server.delimiter('node-app~$');

    //wrap each action method of a command to a function which makes sure that
    //synchronously throwed errors are supressed and logged into stderr
    this.server.on("command_registered", function(opt) {
        var cmd = opt.command;
        var _action = cmd.action;

        cmd.action = function(fn) {
            return _action.call(cmd, function(args, callback) {
                try {
                    return fn.apply(this, arguments);
                } catch(e) {
                    //log error to stderr and continue
                    this.log(e);
                    return callback();
                }
            });
        };
    });

    Object.keys(commands).forEach(function(name) {
        commands[name].build(cli);
    });

    // TODO
    // this.options.validator['#appConfiguration'] is required to be set
    // by serviceIntegrity
    if (   !_.isPlainObject(this.options.validator) ) {
        this.options.validator = {};
    }

    if (!_.isPlainObject(this.options.validator.definitions)) {
        this.options.validator.definitions = {};
    }

    if (!this.options.validator.definitions.hasOwnProperty('#appConfiguration')) {
        this.options.validator.definitions['#appConfiguration'] = {};
    }

}

CLI.prototype = Object.create(App.prototype);
CLI.prototype.constructor = CLI;

/**
 *
 * @return {undefined}
 */
CLI.prototype.$init = function() {
    this.emit('pre-init', this);
    this.emit('post-init', this);
    this.on('post-buid', function(app) {

        if (app.config.listen || app.config.show) {

            if (app.config.listen) {
                app.listen(app.config.listen);
            }
            if (app.config.show) {
                app.show();
            }
        }
    });
};

/**
 * listen
 *
 * @param {String}  port
 * @param {Object}  [options]
 * @param {Boolean} [options.ssl=false]
 * @param {Boolean} [options.logActivity=false]
 *
 * @return {CLI}
 */
CLI.prototype.listen = function(port, options) {
    var self = this;
    options = _.clone(options || {});


    options.port = port;
    process.nextTick(function() {
        self.server.server.server.on('listening', function() {
            self.emit('listening', self);
        });
    });

    //TODO it's not 100% ensured that the `listening` listener will be binded
    //before the event is emited
    self.server.listen(function(req, res) {
        res.write('CLI up');
        res.end();
    }, options);
    return this;
};

/**
 * close
 *
 * @return {Promise<CLI>}
 */
CLI.prototype.close = function() {
    var self = this;

    return new Promise(function(resolve, reject) {
        //self.server.server.io.close();
        self.server.server.server.close(function(err) {
            if (err) {
                return reject(err);
            }

            return resolve(self);
        });
    });
};

/**
 * show
 *
 * @return {CLI}
 */
CLI.prototype.show = function() {
    this.server.show();
    return this;
};
