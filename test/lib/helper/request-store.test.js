'use strict';

require('chai').should();
const assert = require('assert');
const mockery = require('mockery');
const sinon = require('sinon');
const AdmZip = require('adm-zip');

const ecosystem = {
    store: 'https://test-store.screwdriver.cd'
};
const buildId = 1234;
const token = 'dummytoken';

describe('Request to Store Unit Test', () => {
    let store;
    let mockConfig;
    let mockRequest;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        mockRequest = sinon.stub();
        mockConfig = {
            get: sinon.stub()
        };

        mockery.registerMock('config', mockConfig);
        mockery.registerMock('got', mockRequest);

        mockConfig.get.withArgs('ecosystem').returns(ecosystem);

        // eslint-disable-next-line global-require
        store = require('../../../lib/helper/request-store');
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    describe('getZipArtifact function', () => {
        it('can download artifacts ZIP from Store', async () => {
            const testZip = new AdmZip();

            testZip.addFile('test-artifact1.txt', Buffer.from('test artifact 1'));

            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/SD_ARTIFACT.zip',
                    method: 'GET',
                    headers: {
                        Authorization: 'dummytoken'
                    },
                    retry: {
                        limit: 5
                    },
                    responseType: 'buffer'
                })
                .resolves({ body: testZip.toBuffer() });

            try {
                const result = await store.getZipArtifact(buildId, token);

                result.body.should.deep.equal(testZip.toBuffer());
            } catch (err) {
                assert.fail('Never reaches here');
            }
        });

        it('throws exception when some error occurs', async () => {
            const errObj = { response: { body: Buffer.from('Some Error!') } };

            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/SD_ARTIFACT.zip',
                    method: 'GET',
                    headers: {
                        Authorization: 'dummytoken'
                    },
                    retry: {
                        limit: 5
                    },
                    responseType: 'buffer'
                })
                .throws(errObj);

            try {
                await store.getZipArtifact(buildId, token);
            } catch (err) {
                assert.equal(err.message, 'Some Error!');
            }
        });
    });

    describe('putArtifact function', () => {
        it('can upload artifact to Store', async () => {
            const fileName = 'test-artifact1.txt';
            const file = Buffer.from('test artifact 1');

            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/test-artifact1.txt',
                    method: 'PUT',
                    headers: {
                        Authorization: 'dummytoken',
                        'Content-Type': 'text/plain'
                    },
                    retry: {
                        limit: 5
                    },
                    body: Buffer.from('test artifact 1')
                })
                .resolves({ statusCode: 202 });

            try {
                const result = await store.putArtifact(buildId, token, fileName, file);

                assert.equal(result.statusCode, 202);
            } catch (err) {
                assert.fail('Never reaches here');
            }
        });

        it('throws exception when some error occurs', async () => {
            const fileName = 'test-artifact1.txt';
            const file = Buffer.from('test artifact 1');
            const errObj = { response: { body: Buffer.from('Some Error!') } };

            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/test-artifact1.txt',
                    method: 'PUT',
                    headers: {
                        Authorization: 'dummytoken',
                        'Content-Type': 'text/plain'
                    },
                    retry: {
                        limit: 5
                    },
                    body: Buffer.from('test artifact 1')
                })
                .throws(errObj);

            try {
                await store.putArtifact(buildId, token, fileName, file);
            } catch (err) {
                assert.equal(err.message, 'Some Error!');
            }
        });
    });

    describe('deleteZip function', () => {
        it('can delete zip file to Store', async () => {
            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/SD_ARTIFACT.zip',
                    method: 'DELETE',
                    headers: {
                        Authorization: 'dummytoken'
                    },
                    retry: {
                        limit: 5
                    }
                })
                .resolves({ statusCode: 204 });

            try {
                const result = await store.deleteZip(buildId, token);

                assert.equal(result.statusCode, 204);
            } catch (err) {
                assert.fail('Never reaches here');
            }
        });

        it('throws exception when some error occurs', async () => {
            const errObj = { response: { body: Buffer.from('Some Error!') } };

            mockRequest
                .withArgs({
                    url: 'https://test-store.screwdriver.cd/v1/builds/1234/ARTIFACTS/SD_ARTIFACT.zip',
                    method: 'DELETE',
                    headers: {
                        Authorization: 'dummytoken'
                    },
                    retry: {
                        limit: 5
                    }
                })
                .throws(errObj);

            try {
                await store.deleteZip(buildId, token);
            } catch (err) {
                assert.equal(err.message, 'Some Error!');
            }
        });
    });
});
