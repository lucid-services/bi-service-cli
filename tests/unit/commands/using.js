var rewire     = require('rewire');
var sinon      = require('sinon');
var chai       = require('chai');
var sinonChai  = require("sinon-chai");
var service    = require('serviser');

var Config     = require('serviser-config').Config;
var ServerMock = require('../mocks/server.js');
var CLI        = require('../../../lib/index.js').CLI;
var lsCmd      = require('../../../lib/commands/ls.js');
var usingCmd   = rewire('../../../lib/commands/using.js');

var AppManager = service.AppManager;
var App        = service.App;
var expect     = chai.expect;

chai.use(sinonChai);
chai.should();

describe('`using` command', function() {

    before(function() {
        this.models = {
            odm: {},
            orm: {}
        };
        this.config = new Config();

        this.service = new service.Service(this.config);
        this.appManager = this.service.appManager;

        var app = this.app = this.appManager.buildApp(this.config, {name: 'app'});
        var app2 = this.app2 = this.appManager.buildApp(this.config, {name: 'app2'});

        app.server = new ServerMock;
        app2.server = new ServerMock;

        this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

        this.logStub = sinon.stub();
        this.printAppsSpy = sinon.spy(lsCmd, 'printApps');

        this.action = usingCmd.action(this.cli).bind({
            log: this.logStub
        });
    });

    beforeEach(function() {
        this.logStub.reset();
        this.printAppsSpy.reset();

        this.cli.apps = [];
    });

    after(function() {
        this.printAppsSpy.restore();
    });

    describe('action', function() {
        it('should print an error when there are no apps connected to the cli', function() {
            var self = this;

            function testCase() {
                self.action({}, sinon.spy());
            }

            expect(testCase).to.throw(Error);
        });

        it('should print table of connected apps to the cli', function() {
            this.cli.apps.push(this.app);
            this.cli.apps.push(this.app2);

            this.action({}, sinon.spy());

            this.printAppsSpy.should.have.been.calledOnce;
            this.logStub.should.have.been.calledOnce;
            this.logStub.should.have.been.calledWith(
                this.printAppsSpy.firstCall.returnValue.toString()
            );
        });

        it('should call the callback', function() {
            var callbackSpy = sinon.spy();

            this.cli.apps.push(this.app2);
            this.action({}, callbackSpy);

            callbackSpy.should.have.been.calledOnce;
        });
    });
});
