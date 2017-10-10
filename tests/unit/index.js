var sinon          = require('sinon');
var chai           = require('chai');
var sinonChai      = require("sinon-chai");
var chaiAsPromised = require('chai-as-promised');
var Vantage        = require('bi-vantage');
var VorpalUI       = require('bi-vorpal/lib/ui');
var service        = require('bi-service');

var Config     = require('bi-config').Config;
var CLI        = require('../../lib/index.js').CLI;
var commands   = require('../../lib/commands');
var AppManager = service.AppManager;
var App        = service.App;

//this makes sinon-as-promised available in sinon:
require('sinon-as-promised');

var expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

before(function() {
    process.setMaxListeners(100);
});

describe('CLI', function() {
    before(function() {
        VorpalUI.setMaxListeners(100);
        this.models = {};
        this.config = new Config();

        this.service = new service.Service(this.config);
        this.appManager = this.service.appManager;
        var app = this.app = this.appManager.buildApp(this.config, {name: 'app'});
    });

    describe('constructor', function() {
        it('should have Vantage server object', function() {
            var cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            cli.should.have.property('vantage').that.is.an.instanceof(Vantage);
        });

        it('should register cli commands on server', function() {
            var cmdSpies = [];
            Object.keys(commands).forEach(function(name) {
                cmdSpies.push(sinon.spy(commands[name], 'build'));
            });

            var cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            cmdSpies.forEach(function(spy) {
                spy.should.have.been.calledOnce;
                spy.should.have.been.calledWith(cli);

                spy.getCall(0).returnValue.remove();//unregister cmd
                spy.restore();
            });
        });

        it('should throw an Error when we provide options.appManager that is not an instanceof AppManager', function() {
            function test() {
                var cli = new CLI(this.appManager, new Config(), {name: 'cli'});
            }

            expect(test).to.throw(Error);
        });
    });

    describe('close', function() {
        before(function() {
            this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            //TODO causes the npm run coverage to print [ERROR]
            //event though all tests pass
            this.cli.listen(3100);

            this.cliServerCloseStub = sinon.stub(this.cli.vantage.server.server, 'close');
        });

        beforeEach(function() {
            this.cliServerCloseStub.reset();
        });

        after(function() {
            this.cliServerCloseStub.restore();
        });

        it('should return fulfilled promise', function() {
            this.cliServerCloseStub.yields();

            return this.cli.close().should.become(this.cli);
        });

        it('should return rejected promise', function() {
            var error = new Error('server.close test');
            this.cliServerCloseStub.yields(error);

            return this.cli.close().should.be.rejectedWith(error);
        });
    });

    describe('listen', function() {
        before(function() {
            this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            this.cliServerListenSpy = sinon.spy(this.cli.vantage, 'listen');
        });

        beforeEach(function() {
            this.cliServerListenSpy.reset();
        });

        after(function() {
            this.cliServerListenSpy.restore();
            return this.cli.close();
            delete this.cli();
        });

        it('should call cli.vantage.listen with provided options', function(done) {
            var self = this;
            var options = {
                ssl: false
            };

            //TODO causes the npm run coverage to print [ERROR]
            //event though all tests pass
            this.cli.on('listening', function listening() {
                self.cliServerListenSpy.should.have.been.calledOnce;
                self.cliServerListenSpy.should.have.been.calledWith(
                    sinon.match.func,
                    sinon.match(function(options) {
                        options.port = 3101;
                        return options.should.be.eql(options);
                    })
                );
                self.cli.removeListener('listening', listening);
                done();
            });
            this.cli.listen(3101, options);

        });

        it('should return self (cli)', function() {
            //TODO causes the npm run coverage to print [ERROR]
            //event though all tests pass
            this.cli.listen(3102).should.be.equal(this.cli);
        });
    });

    describe('show', function() {
        before(function() {
            this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            this.cliServerShowStub = sinon.stub(this.cli.vantage, 'show');
        });

        after(function() {
            this.cliServerShowStub.restore();
            delete this.cli;
        });

        it('should call cli.vantage.show method', function() {
            this.cli.show();
            this.cliServerShowStub.should.have.been.calledOnce;
        });

        it('should return self (cli)', function() {
            this.cli.show().should.be.equal(this.cli);
        });
    });

    describe('Command definition interface every command should implement: ', function() {
        before(function() {
            this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

            //we can avoid "command registered more than once" warning by
            //explicitly unregistering cmd before it's registered again
            //in test cases
            this.cli.vantage.commands.forEach(function(cmd) {
                cmd.remove();
            });
        });

        it('should return the Command object', function() {
            var self = this;

            Object.keys(commands).forEach(function(name) {
                var cmd = commands[name].build(self.cli);
                //we don't have access to the Command constructor
                Object.getPrototypeOf(cmd).constructor.name.should.be.equal('Command');
                cmd.remove();
            });
        });

        it('(a command module) should export an `action` function', function() {
            Object.keys(commands).forEach(function(name, index) {
                commands[name].should.have.property('action').that.is.instanceof(Function);
            });
        });

        it('should assign `action` function to the Command object', function() {
            var self = this;

            this.cli.vantage.on("command_registered", onCmd);

            Object.keys(commands).forEach(function(name, index) {
                var cmdActionStub = sinon.stub(commands[name], 'action');
                var actionSpy = sinon.spy();
                cmdActionStub.returns(actionSpy);

                var cmd = commands[name].build(self.cli);

                cmdActionStub.should.have.been.calledOnce;
                cmdActionStub.should.have.been.calledWith(self.cli);
                cmd.action.should.have.been.calledOnce;
                cmd.action.should.have.been.calledWith(actionSpy);

                cmd.remove();
                cmdActionStub.restore();
            });

            this.cli.vantage.removeListener("command_registered", onCmd);

            function onCmd(opt) {
                sinon.spy(opt.command, 'action');
            }
        });

        describe('synchronous error handling', function() {
            before(function() {
                var self = this;

                this.error = new Error('Synchronous test error');
                this.cmdActionBck = {};

                Object.keys(commands).forEach(function(name, index) {
                    self.cmdActionBck[name] = commands[name].action;

                    commands[name].action = function() {
                        return function() {
                            throw self.error;
                        };
                    };
                });
            });

            after(function() {
                var self = this;

                Object.keys(commands).forEach(function(name, index) {
                    commands[name] = self.cmdActionBck[name];
                });
            });

            Object.keys(commands).forEach(function(name, index) {
                it(`builded "${name}" command should correctly handle synchronously throwed Error`, function() {
                    var cmdCallbackSpy = sinon.spy();
                    var logStub = sinon.stub(console, 'error');
                    var cmd = commands[name].build(this.cli);

                    expect(cmd._fn.bind({
                        log: logStub
                    }, null, cmdCallbackSpy)).to.not.throw(Error);
                    cmdCallbackSpy.should.have.been.calledOnce;
                    logStub.should.have.been.calledOnce;
                    logStub.should.have.been.calledWith(this.error);

                    logStub.restore();
                    cmd.remove();
                });
            });
        });
    });
});
