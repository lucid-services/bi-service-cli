var _       = require('lodash');
var Promise = require('bluebird');
var service = require('bi-service');

var ServiceConflictError = require('../../error/ServiceConflictError.js');

var ServiceError = service.error.ServiceError;
var serviceIntegrity = service.serviceIntegrity;

module.exports = function(app) {
    var router = app.buildRouter({
        version: 1.0,
        url: '/api/{version}/integrity'
    });

    router.buildRoute({
        type: 'get',
        url : '/',
        sdkMethodName: 'inspectIntegrity',
        summary: 'Provides service integrity status'
    })
    .respondsWith({})
    .main(function (req, res) {

        var apps = router.App.appManager.apps;

        return Promise.map(apps, function(app) {
            //throws a ServiceError in case of integrity verification failure
            return serviceIntegrity.inspect(app, {
                inspectors: {
                    services: serviceIntegrity.inspectDependentServices(app)
                }
            });
        }).then(function(results) {
            res.json({});
        });
    }).catch(ServiceError, function(err) {

        var context = _.reduce(err.context, function(out, val, index) {
            if (typeof val === 'object') {
                out[index] = val;
            }

            return out;
        }, {});

        return Promise.reject(new ServiceConflictError(context));
    });
};
