var rewire     = require('rewire');
var sinon      = require('sinon');
var chai       = require('chai');
var sinonChai  = require("sinon-chai");
var service    = require('bi-service');

var ConfigMock      = require('../mocks/config.js');
var ServerMock      = require('../mocks/server.js');
var CLI             = require('../../../lib/index.js').CLI;
var inspectRouteCmd = rewire('../../../lib/commands/inspectRoute.js');

var AppManager = service.AppManager;
var App        = service.App;
var expect     = chai.expect;

chai.use(sinonChai);
chai.should();

describe('`inspect route` command', function() {
    before(function() {
        this.models = {
            odm: {},
            orm: {}
        };
        this.config = new ConfigMock();

        this.configGetStub = sinon.stub(this.config, 'get');
        this.configGetStub.withArgs('baseUrl').returns('http://127.0.0.1');
        this.configGetStub.withArgs('protocol').returns('http:');
        this.configGetStub.withArgs('host').returns('127.0.0.1');

        this.appManager = new AppManager(this.models);

        var app = this.app = this.appManager.buildApp(this.config, {name: 'public'});

        app.server = new ServerMock;

        this.cli = new CLI(this.appManager, new ConfigMock(), {name: 'cli'});

        var router = app.buildRouter({
            version: '1.0',
            url: '/'
        });

        var route = router.buildRoute({
            url: '/app',
            type: 'get'
        });

        route.validate({
            $is: Object
        }, 'query');
        route.main(sinon.spy());

        this.route = route;
        this.logStub = sinon.spy();

        this.action = inspectRouteCmd.action(this.cli).bind({
            log: this.logStub
        });
    });

    beforeEach(function() {
        this.logStub.reset();
        this.configGetStub.reset();
    });

    describe('inspectRoute', function() {
        it('should return an object describing inspected route', function() {
            var output = inspectRouteCmd.inspectRoute(this.route);

            output.should.be.eql({
                absolute: this.route.getAbsoluteUrl(),
                app: 'public',
                summary: '',
                // doesn't realy test much here regarding route's file definition location
                //TODO fix this, incorrect file path is assigned, should be acual route definition file path instead of inspectRoute
                fpath: require.resolve('./inspectRoute.js'),
                method: this.route.options.type,
                relative: this.route.getUrl(),
                uid: 'getApp_v1.0',
                sdkMethod: 'getApp',
                middlewares: {
                    validator: [{
                        target: 'query',
                        schema: {$is: 'Object'}
                    }]
                }
            });
        });
    });
});
