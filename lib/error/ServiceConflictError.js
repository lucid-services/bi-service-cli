var util            = require('util');
var service         = require('serviser');
var HttpStatusCodes = require('http-status-codes');

var RequestError    = service.error.RequestError;

module.exports = ServiceConflictError;

/**
 * Error ServiceConflictError
 *
 * @param {Object} [context]
 * */
function ServiceConflictError(context) {

    RequestError.call(this, {
        message: 'Conflict',
        code: HttpStatusCodes.CONFLICT,
        desc: "Service integrity is broken"
    });

    this.context = context;
}

util.inherits(ServiceConflictError, RequestError);
ServiceConflictError.prototype.super = RequestError.prototype;


/**
 * @return {Object}
 */
ServiceConflictError.prototype.toJSON = function() {
    var data = this.super.toJSON.call(this);
    data.context = this.context;

    return data;
};

/**
 * @return {Object}
 */
ServiceConflictError.prototype.toSwagger = function() {
    var schema = this.super.toSwagger.call(this);
    var contextProp = {
        type: "object",
        properties: {
            code: {
                type: "integer",
                format: "int64"
            },
            message: {
                type: "string",
            }
        }
    };

    schema.schema.properties.context = contextProp;

    return schema;
};
