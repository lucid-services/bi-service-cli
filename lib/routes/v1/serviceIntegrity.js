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
    .validate({
        properties: {
            spread: {
                type: 'boolean',
                $desc: 'Whether to spread integrity checks to dependent remote web services',
                default: true
            }
        }
    }, 'query')
    .main(function (req, res) {

        var resourceManager = router.App.service.resourceManager;

        return resourceManager.inspectIntegrity(
            //when spread==false, exclude 'bi-service' group of remote resources
            //aka. exclude resources which are tagged with 'bi-service' label
            req.query.spread ? undefined : 'bi-service',
            {mode: req.query.spread ? 'include' : 'exclude'}
        ).then(function() {
            res.json({});
        }).catch(ServiceError, function(err) {
            var context = _.reduce(err.context, function(out, val, index) {
                if (val instanceof Error) {
                    if (typeof val.toLogger === 'function') {
                        out[index] = val.toLogger();
                    } else if (typeof val.toJSON === 'function') {
                        out[index] = val.toJSON();
                    } else {
                        out[index] = val.message;
                    }
                }

                return out;
            }, {});

            return Promise.reject(new ServiceConflictError(context));
        });
    });
};
