var _           = require('lodash');
var Table       = require('easy-table');
var Validator   = require('bi-json-inspector');
var stringifier = require('bi-json-stringifier');
var util        = require('util');
var chalk       = require('chalk');
var service     = require('bi-service');

var Route = service.Route;

var Command = {
    /**
     * `ls` command
     *
     * @param {CLI} cli
     *
     * @return {Command}
     */
    build: function(cli) {
        this.printingOptions = {
            loose: true,
            printing: {
                string: ['', ''],
                function: ['', ''],
                regexp: [chalk.styles.cyan.open, chalk.styles.cyan.close],
                boolean: [chalk.styles.green.open, chalk.styles.green.close],
                null: [chalk.styles.green.open, chalk.styles.green.close],
                number: [chalk.styles.yellow.open, chalk.styles.yellow.close]
            }
        };

        return cli.vantage.command('inspect route <uid>')
        .action(this.action(cli));
    },

    /**
     * validate
     *
     * @param {CLI} cli
     * @return {String|undefined}
     */
    validate: function validate(cli) {
        return function(args) {
            if (!cli.apps.length) {
                throw new Error('No app selected. See `use` cmd');
            }
        }
    },

    /**
     * action
     *
     * @param {CLI} cli
     * @return {Function}
     */
    action: function action(cli) {
        var cmd = this;

        return function(args, callback) {
            var self = this;
            var printer;

            cmd.validate(cli).call(this, args);

            if (args.uid) {

                var route = cmd.findRoute(cli.options.apps, args.uid);
                if (!route) {
                    this.log('Route not found');
                    return callback();
                }

                var routeInfo = cmd.inspectRoute(route);
                var middlewares = routeInfo.middlewares;
                delete routeInfo.middlewares;

                Object.keys(routeInfo).forEach(function(key) {
                    routeInfo[chalk.bold(key)] = routeInfo[key];
                    delete routeInfo[key];
                });

                this.log('');
                this.log(Table.print(routeInfo));
                this.log((route.description.description || '').replace(/\ {2,}/g, ' '));
                this.log('');

                if (middlewares.validator) {

                    printer = stringifier.strategies.json(
                        _.assign({}, cmd.printingOptions, {
                            hooks: {
                                key: highlightValidatorKeywords
                            }
                        })
                    );

                    middlewares.validator.forEach(function(val) {
                        this.log(
                            chalk.yellow.bgBlack.bold.underline(
                                val.target.toUpperCase() + '-schema:'
                            )
                        );
                        this.log('');
                        this.log(printer(val.schema));
                    }, this);
                }

                if (middlewares.client) {

                    var printer = stringifier.strategies.json(
                        _.assign({}, cmd.printingOptions, {
                            hooks: {
                                key: function(key) {
                                    return chalk.bold(key);
                                }
                            }
                        })
                    );

                    var clientOpts = middlewares.client.pop();

                    this.log(
                        chalk.yellow.bgBlack.bold.underline(
                            'CLIENT:'
                        )
                    );
                    this.log('');
                    this.log(printer(clientOpts));
                }
                return callback();
            }
        };
    },

    /**
     * @param {Route} route
     *
     * @return {Object}
     */
    inspectRoute: function inspectRoute(route) {
        var self, steps, responses, responseSchema;

        if (!(route instanceof Route)) {
            return {};
        }

        var out  = {
            app      : route.Router.App.options.name,
            fpath    : route.fileSystemLocation,
            uid      : route.uid,
            method   : route.options.type,
            sdkMethod: route.description.sdkMethodName,
            relative : route.getUrl(),
            absolute : route.getAbsoluteUrl(),
            summary  : route.description.summary
        };
        self            = this;
        steps           = _.clone(route.steps);
        responses       = route.description.responses;
        out.middlewares = {};

        //include success response schema
        if (   responses.hasOwnProperty('200')
            && responses['200'].length
        ) {
            responseSchema = responses['200'][0].schema;

            if (   !(responseSchema instanceof Function
                && Error.prototype.isPrototypeOf(responseSchema.prototype)
                || responseSchema.prototype instanceof Error)
                && !(responseSchema instanceof Error)
            ) {
                steps.push({
                    name: 'validator',
                    args: [
                        responseSchema,
                        '200-response'
                    ]
                });
            }
        }

        steps.forEach(function(step) {
            if (!self.inspectMiddlewares.hasOwnProperty(step.name)) {
                return;
            }

            if (!out.middlewares.hasOwnProperty(step.name)) {
                out.middlewares[step.name] = [];
            }

            var data = self.inspectMiddlewares[step.name](step, route);
            out.middlewares[step.name].push(data);
        });

        return out;
    },

    inspectMiddlewares: {
        /**
         * @param {Object} step
         * @param {Array} [step.args] - argument list passed to the validator middleware
         * @param {String} step.name
         * @param {Function} step.fn - express middleware
         * @param {Route} route
         * @return {Object}
         */
        validator: function validatorMiddlewareInspector(step, route) {
            var args = step.args;

            if (!args) {
                return {};
            }

            var schema       = args[0]
            ,   target       = args[1]
            ,   customSchema = args[2]
            ,   options      = args[3];

            if (typeof schema === 'string') {
                schema = route.Router.App.options.validator.definitions[schema];
            }
            var validator = new Validator.Validator(schema, options);

            schema = _.cloneDeepWith(validator.getSchema(customSchema), function(val) {
                if (val === String) return 'String';
                if (val === Object) return 'Object';
                if (val === Array) return 'Array';
                if (val === Number) return 'Number';
                if (val === Boolean) return 'Boolean';
            });

            return {
                schema: schema,
                target: target
            };
        },

        /**
         * @param {Object} step
         * @param {Array} [step.args] - argument list passed to the validator middleware
         * @param {String} step.name
         * @param {Function} step.fn - express middleware
         * @param {Route} route
         * @return {Object}
         */
        client: function clientMiddlewareInspector(step, route) {
            return _.cloneWith(step.fn.defaults, function(val) {
                var type = typeof val;
                if (type == 'function') {
                    return val.toString();
                } else if (type == 'undefined') {
                    return 'undefined';
                }
            });
        }
    },

    /**
     * @param {Array} apps
     * @param {String} uid
     *
     * @return {Route}
     */
    findRoute: function findRoute(apps, uid) {
        var route;

        apps = _.compact(apps);

        loop1: for (var i = 0, len = apps.length; i < len; i++) {
            var routers = apps[i].routers;

            if(!Array.isArray(routers)) continue;

            loop2: for (var y = 0, leng = routers.length; y < leng; y++) {
                var routes = routers[y].routes;

                if(!Array.isArray(routes)) continue;

                loop3: for (var z = 0, length = routes.length; z < length; z++) {
                    if (routes[z].uid == uid) {
                        route = routes[z];
                        break loop1;
                    }
                }
            }
        }

        return route;
    }
};


/**
 * @param {String|Integer} key
 * @param {Object} context
 *
 * @return {String|Integer}
 */
function highlightValidatorKeywords(key, context) {
    if (key.toString().match(/^\$.*$/)) {
        return chalk.white.bold(key);
    }
    return key;
}

module.exports = Object.create(Command);
