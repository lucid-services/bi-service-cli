const service        = require('bi-service');
const path           = require('path');
const chai           = require('chai');
const sinon          = require('sinon');
const sinonChai      = require("sinon-chai");
const chaiAsPromised = require('chai-as-promised');
const Promise        = require('bluebird');
const request        = require('supertest');

const CLI        = require('../../lib/index.js').CLI;
const Config     = require('bi-config').Config;
const AppManager = service.AppManager;

global.Promise = Promise;

//this makes sinon-as-promised available in sinon:
require('sinon-as-promised', Promise);

const expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('functional cli http server', function() {
    before(function(done) {

        this.config = new Config();

        this.service = new service.Service(this.config);
        this.appManager = this.service.appManager;

        this.cli = new CLI(this.appManager, new Config(), {name: 'cli'});

        this.cli.once('post-init', function() {
            this.build();
            done();
        });

        this.request = request(this.cli.expressApp);
    });

    describe('GET /api/v1.0/integrity', function() {
        before(function() {
            this.resourceMock = {
                inspectIntegrity: sinon.stub()
            };
        });

        afterEach(function() {
            this.resourceMock.inspectIntegrity.reset();
        });

        it('should return json response', function(done) {
            let req = this.request.get('/api/v1.0/integrity');
            req.expect(200, {}, done);
        });

        it('should NOT inspect resources tagged with `bi-service` label when `spread` option is set to false', function(done) {
            const self = this;
            const err = new service.error.ServiceError('Expected inspectIntegrity method of bi-service resource mock to NOT be called');
            this.resourceMock.inspectIntegrity.rejects(err);

            this.service.resourceManager.register(
                'bi-service-sdk-mock',
                this.resourceMock
            );

            this.service.resourceManager.tag('bi-service-sdk-mock', 'bi-service');

            let req = this.request.get('/api/v1.0/integrity?spread=false');
            req.expect(200, {}).end(function(err, res) {
                //TODO use public method to remove a resource from the manager
                //object when it is available in bi-service@1.0.0
                self.service.resourceManager.resources = {};
                self.service.resourceManager.tags = {};

                try {
                    self.resourceMock.inspectIntegrity.should.have.callCount(0);
                } catch(e) {
                    return done(e);
                }

                done(err);
            });
        });

        it('should inspect all registered resources', function(done) {
            const self = this;
            this.resourceMock.inspectIntegrity.resolves(true);

            this.service.resourceManager.register('resource1', this.resourceMock);
            this.service.resourceManager.register('resource2', this.resourceMock);
            this.service.resourceManager.tag('resource1', 'bi-service');


            let req = this.request.get('/api/v1.0/integrity');
            req.end(function(err) {
                //TODO use public method to remove a resource from the manager
                //object when it is available in bi-service@1.0.0
                self.service.resourceManager.resources = {};
                self.service.resourceManager.tags = {};
                try {
                    self.resourceMock.inspectIntegrity.should.have.callCount(2);
                } catch(e) {
                    return done(e)
                }
                done(err)
            });
        });

        it('should return 409 status code with valid json reponse', function(done) {
            const err = new service.error.ServiceError('test error');

            this.resourceMock.inspectIntegrity.rejects(err);
            this.service.resourceManager.register('failing-resource', this.resourceMock);

            let req = this.request.get('/api/v1.0/integrity');
            req.expect(409, {
                code: 409,
                message: 'Conflict',
                api_code: null,
                uid: null,
                context: {
                    'failing-resource': err.toLogger()
                }
            }, done);
        });
    });
});
