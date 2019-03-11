var rewire           = require('rewire');
var sinon            = require('sinon');
var chai             = require('chai');
var sinonChai        = require("sinon-chai");
var chaiAsPromised   = require('chai-as-promised');
var Promise          = require('bluebird');
var service          = require('serviser');

var Config           = require('serviser-config').Config;
var CLI              = require('../../../lib/index.js').CLI;
var integrityCmd     = rewire('../../../lib/commands/integrity.js');

//this makes sinon-as-promised available in sinon:
require('sinon-as-promised');

var ServiceError     = service.error.ServiceError;
var expect           = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('`integrity` command', function() {
    before(function() {
        this.service = new service.Service(new Config);
        var appManager = this.service.appManager;
        this.appManager = appManager;

        this.resourceInspectIntegrityStub = sinon.stub();

        //
        this.service.resourceManager.add('res1', {
            inspectIntegrity: this.resourceInspectIntegrityStub
        });
        //
        this.service.resourceManager.add('res2', {
            inspectIntegrity: this.resourceInspectIntegrityStub
        });

        this.cli = new CLI(appManager, new Config(), {name: 'cli'});

        this.logStub = sinon.stub();
        this.action = integrityCmd.action(this.cli).bind({
            log: this.logStub
        });
    });

    beforeEach(function() {
        this.logStub.reset();
    });

    describe('action', function() {
        describe('stub', function() {
            before(function() {
                this.resourceManagerInspectIntegrity = sinon.stub(this.service.resourceManager, 'inspectIntegrity');
            });

            after(function() {
                this.resourceManagerInspectIntegrity.restore();
            });

            beforeEach(function() {
                this.resourceManagerInspectIntegrity.reset();
            });

            it('should log an error when unexpected exception occurs', function(done) {
                var self = this;
                var err = new Error('test');

                this.resourceManagerInspectIntegrity.returns(Promise.reject(err))

                this.action({}, function() {
                    self.logStub.should.have.been.calledOnce;
                    self.logStub.should.have.been.calledWith(err.stack);
                    done();
                });
            });

            it('should call resourceManager.inspectIntegrity', function(done) {
                var self = this;
                this.resourceManagerInspectIntegrity.returns(Promise.resolve({}));

                this.action({}, function() {
                    self.resourceManagerInspectIntegrity.should.have.been.calledOnce;
                    done();
                });
            });

            it('should print the results of inspection', function(done) {
                var self = this;
                var outputData = [{
                    couchbase: 'couchbase',
                    postgres: 'postgres',
                    configuration: 'configuration',
                    node: 'node'
                }];

                var printSpy = sinon.spy(integrityCmd, 'print');

                this.resourceManagerInspectIntegrity.returns(Promise.resolve(outputData));

                this.action({}, function() {
                    printSpy.should.have.been.calledOnce;
                    self.logStub.should.have.been.calledWith(printSpy.firstCall.returnValue);
                    printSpy.restore();
                    done();
                });
            });

        });

        it('should convert serviceIntegrity error data object to an Array when inspection fails', function(done) {
            var self = this;
            var error = new ServiceError({context: 'test error'});
            var outputData = {some: 'data'};

            var printSpy = sinon.spy(integrityCmd, 'print');

            this.resourceInspectIntegrityStub.onFirstCall().returns(Promise.resolve(outputData));
            this.resourceInspectIntegrityStub.onSecondCall().returns(Promise.reject(error));

            this.action({}, function() {
                try {
                    self.resourceInspectIntegrityStub.should.have.been.calledTwice;
                    printSpy.should.have.been.calledOnce;
                    self.logStub.should.have.been.calledWith(printSpy.firstCall.returnValue);
                    printSpy.restore();
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('print', function() {
        it('should return correctly formated string', function() {
            var data = {
                node: true,
                couchbase: true,
                postgres: false,
                configuration: {},
                session: false
            };

            var output = integrityCmd.print(data);

            var expected = 'node           true \n' +
                           'couchbase      true \n' +
                           'postgres       false\n' +
                           'configuration  true \n' +
                           'session        false\n';
            output.should.be.equal(expected);
        });
    });
});
