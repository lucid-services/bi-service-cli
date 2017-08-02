module.exports.CLI = CLI;

var _       = require('lodash');
var Promise = require('bluebird');
var Vantage = require('bi-vantage');
var service = require('bi-service');

var App        = service.App;
var AppStatus  = service.AppStatus;
var AppManager = service.AppManager;
var commands   = require('./commands');


/**
 * buildCLI
 *
 * @param {Config} cfg
 * @param {Object} [options] - see {App} options for more details
 *
 * @return {App}
 */
AppManager.prototype.buildCLI = function(cfg, options) {
    var cli = new CLI(this, cfg, options);
    cli.on('error', this.$buildAppErrorListener(cli));
    this.add(cli);
    this.emit('build-app', cli);

    return cli;
};

//register CLI initialization listeners
service.Service.once('set-up', function(appManager, cfg) {
    if (cfg.get('apps:cli')) {
        cfg = cfg.get('apps:cli');
    } else if (cfg.get('cli')) {
        cfg = cfg.get('cli');
    } else {
        return;
    }

    //postpone CLI app initialization to the point where we synchronously
    //prepare all apps for startup
    var config = appManager.service.config;
    service.Service.once('app', function() {
        var conf = config.createLiteralProvider(cfg);
        conf.use('memory');

        var cli = appManager.buildCLI(conf, {name: 'cli'});
    });
});

service.Service.on('app', function(app) {
    var config = app.service.config;
    if (app instanceof CLI && app.config.get('show')) {
        app.show();
    }
});

/**
* CLI
*
* @param {AppManager} appManager
* @param {Config} cfg - config
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
function CLI(appManager, cfg, options) {
    App.call(this, appManager, cfg, options);

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

    //default http req body-parser settings
    if (!cfg.get('bodyParser')) {
        cfg.stores.literal.store.bodyParser = {
            // dont allow complex json data structures encoded in url
            json: {extended: false}
        };
    }

    //
    this.options.apps = this.appManager.apps;
    this.apps = [];
    this.vantage = new Vantage();
    //disable auth
    this.vantage.auth(function() {
        return function(args, cb) {
            return cb(void 0, true);
        };
    });
    //this.vantage.auth('basic', {
        //users: options.users || [],
        //hashAlgorithm: options.hashAlgorithm
    //});
    this.vantage.delimiter('node-app~$');

    //wrap each action method of a command to a function which makes sure that
    //synchronously throwed errors are supressed and logged into stderr
    this.vantage.on("command_registered", function(opt) {
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
CLI.prototype._super = App.prototype;

/**
 * @return {undefined}
 */
CLI.prototype.$init = function() {

    this.on('post-init', function() {
        var app = this;

        //load route definitions
        service.moduleLoader.loadModules([
            __dirname + '/routes'
        ], {
            cb: function(module) {
                if (module instanceof Function) {
                    module(app);
                }
            }
        })
    });

    this._super.$init.call(this);
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

    if (!port) {
        return this;
    }

    options.port = port;
    process.nextTick(function() {
        self.vantage.server.server.on('listening', function() {
            self.server = self.vantage.server.server;
            self.$setStatus(AppStatus.OK);
            self.emit('listening', self);
        });
    });

    //TODO make sure that the `listening` listener will be binded
    //before the event is emited
    self.vantage.listen(this.expressApp, options);

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
        if (   !self.vantage.server.server
            || self.vantage.server.server.address() === null
        ) {
            return resolve();
        }
        //self.vantage.server.io.close();
        self.vantage.server.server.close(function(err) {
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
    this.vantage.show();
    this.$setStatus(AppStatus.OK);
    return this;
};
