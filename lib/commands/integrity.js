var _       = require('lodash');
var Promise = require('bluebird');
var Table   = require('easy-table');
var service = require('bi-service');

var ServiceError     = service.error.ServiceError;
var serviceIntegrity = service.serviceIntegrity;

var Command = {

    /**
     * `integrity` command
     *
     * @param {CLI} cli
     * @return {Command}
     */
    build: function(cli) {
        return cli.vantage.command('integrity')
        .description("Performs service availability checks on external resources")
        .action(this.action(cli));
    },

    /**
     * action
     *
     * @param {CLI} cli
     * @returns {Function}
     */
    action: function action(cli) {

        var cmd = this;

        return function(args, callback) {
            var resourceManager = cli.service.resourceManager;

            return resourceManager.inspectIntegrity()
            .catch(ServiceError, function(err) {
                return err.context;
            }).bind(this).then(function(results) {
                this.log(cmd.print(results));
            }).catch(function(err) {
                this.log(err.stack);
                return null;
            }).asCallback(callback);
        };
    },

    /**
     * print
     *
     * @param {Object} results
     *
     * @return {String}
     */
    print: function print(results) {
        var t = new Table;

        Object.keys(results).forEach(function(key) {
            var val = results[key];

            if (val instanceof Error) {
                if (typeof val.toLogger === 'function') {
                    val = val.toLogger();
                } else if (typeof val.toJSON === 'function') {
                    val = val.toJSON();
                } else {
                    val = val.message;
                }
            } else if (typeof val === 'object' && val !== null) {
                val = true;
            }

            t.cell(key, val);
        });

        t.newRow();
        return t.printTransposed();
    }
};

module.exports = Object.create(Command);
