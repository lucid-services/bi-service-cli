var _          = require('lodash');
var rewire     = require('rewire');
var sinon      = require('sinon');
var chai       = require('chai');
var sinonChai  = require("sinon-chai");
var service    = require('serviser');

var Config     = require('serviser-config').Config;
var ServerMock = require('../mocks/server.js');
var CLI        = require('../../../lib/index.js').CLI;
var useCmd     = rewire('../../../lib/commands/use.js');

var AppManager = service.AppManager;
var App        = service.App;

chai.use(sinonChai);
chai.should();

describe('`use` command', function() {

    before(function() {
        this.models = {
            odm: {},
            orm: {}
        };
        this.config = new Config();

        this.service = new service.Service(this.config);
        this.appManager = this.service.appManager;

        var app = this.app = this.appManager.buildApp(this.config, {name: 'public'});
        var app2 = this.app2 = this.appManager.buildApp(this.config, {name: 'private'});

        app.server = new ServerMock;
        app2.server = new ServerMock;

        this.cli = this.appManager.buildCLI(new Config(), {name: 'cli'});

        this.logStub = sinon.stub();
        this.action = useCmd.action(this.cli).bind({
            log: this.logStub
        });
    });

    beforeEach(function() {
        this.logStub.reset();

        this.cli.apps = [];
    });

    describe('action', function() {
        it('(`use *`) should connect all available apps to the cli', function() {
            this.action({apps: '*'}, sinon.spy());

            this.cli.apps.should.have.lengthOf(3);
            this.cli.apps[0].should.be.equal(this.app);
            this.cli.apps[1].should.be.equal(this.app2);
            this.cli.apps[2].should.be.equal(this.cli);
        });

        it('should disconnect all currently conected apps and connect the one specified', function() {
            this.action({
                apps: this.app.server.address().port
            }, sinon.spy());

            this.cli.apps.should.have.lengthOf(1);
            this.cli.apps[0].should.be.equal(this.app);
        });

        it('should disconnect all currently conected apps and connect the one specified (string identifier)', function() {
            this.action({
                apps: this.app2.options.name
            }, sinon.spy());

            _.compact(this.cli.apps).should.have.lengthOf(1);
            _.compact(this.cli.apps)[0].should.be.equal(this.app2);
        });

        it('should log an Invalid argument error', function() {
            this.action({apps: ''}, sinon.spy());

            this.logStub.should.have.been.calledOnce;
            this.logStub.should.have.been.calledWith(sinon.match(function(err) {
                return ~err.message.indexOf('Invalid argument');
            }, 'Invalid argument'));
        });

        it('should call the callback', function() {
            var callbackSpy = sinon.spy();

            this.action({apps: '*'}, callbackSpy);

            callbackSpy.should.have.been.calledOnce;

            this.action({
                apps: this.app.server.address().port
            }, callbackSpy);

            callbackSpy.should.have.been.calledTwice;
        });
    });

});
