var _       = require('lodash');
var Promise = require('bluebird');
var service = require('bi-service');

var ServiceConflictError = require('../../error/ServiceConflictError.js');
var ServiceError = service.error.ServiceError;

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
    .respondsWith(ServiceConflictError)
    .main(function (req, res) {

        var resourceManager = router.App.service.resourceManager;

        return resourceManager.inspectIntegrity().then(function() {
            res.json({});
        }).catch(ServiceError, function(err) {
            var context = _.reduce(err.context, function(out, val, index) {
                if (typeof val === 'object') {
                    out[index] = val;
                }

                return out;
            }, {});

            return Promise.reject(new ServiceConflictError(context));
        });
    });
};
