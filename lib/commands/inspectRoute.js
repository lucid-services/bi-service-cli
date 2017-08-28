var _           = require('lodash');
var Table       = require('easy-table');
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

                Object.keys(routeInfo).forEach(function(key) {
                    routeInfo[chalk.bold(key)] = routeInfo[key];
                    delete routeInfo[key];
                });

                this.log('');
                this.log(Table.print(routeInfo));
                this.log((route.description.description || '').replace(/\ {2,}/g, ' '));
                this.log('');

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
        if (!(route instanceof Route)) {
            return {};
        }

        return {
            app      : route.Router.App.options.name,
            fpath    : route.fileSystemLocation,
            uid      : route.uid,
            method   : route.options.type,
            sdkMethod: route.description.sdkMethodName,
            relative : route.getUrl(),
            absolute : route.getAbsoluteUrl(),
            summary  : route.description.summary
        };
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

module.exports = Object.create(Command);
