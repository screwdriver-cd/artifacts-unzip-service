'use strict';

const assert = require('assert');
const mockery = require('mockery');
const sinon = require('sinon');
const AdmZip = require('adm-zip');

const unzipConfig = {
    buildId: 1234,
    token: 'dummytoken'
};

const fileName1 = 'test-artifact1.txt';
const fileName2 = 'test-artifact2.txt';
const file1 = Buffer.from('test artifact 1');
const file2 = Buffer.from('test artifact 2');

describe('Jobs Unit Test', () => {
    let jobs;
    let mockStore;
    let configMock;
    let sinonSandbox;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
        sinonSandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        mockStore = {
            getZipArtifact: sinon.stub(),
            putArtifact: sinon.stub(),
            deleteZipArtifact: sinon.stub()
        };
        mockery.registerMock('./helper/request-store', mockStore);
        configMock = {
            get: sinon.stub().returns({ parallelUploadLimit: 100 })
        };
        mockery.registerMock('config', configMock);

        // eslint-disable-next-line global-require
        jobs = require('../../lib/jobs');

        sinonSandbox.restore();
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    describe('unzip', () => {
        it('can download artifacts ZIP from Store and re-upload the extracted artifacts to Store', async () => {
            const testZip = new AdmZip();

            testZip.addFile(fileName1, file1);
            testZip.addFile(fileName2, file2);

            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName1, file1)
                .resolves({ statusCode: 202 });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName2, file2)
                .resolves({ statusCode: 202 });
            mockStore.deleteZipArtifact.withArgs(unzipConfig.buildId, unzipConfig.token).resolves({ statusCode: 202 });

            assert.equal(await jobs.start.perform(unzipConfig), null);
        });

        it('upload 200 files, limiting the number of parallel uploads to 100', async () => {
            const FILE_NUM = 200;
            const testZip = new AdmZip();
            const filesName = Array(FILE_NUM)
                .fill()
                .map((_, index) => `test-artifact${index}.txt`);
            const filesContent = Array(FILE_NUM)
                .fill()
                .map((_, index) => Buffer.from(`test artifact ${index}`));
            const spyPromiseAll = sinonSandbox.spy(Promise, 'all');

            Array(FILE_NUM)
                .fill()
                .forEach((_, index) => {
                    testZip.addFile(filesName[index], filesContent[index]);
                    mockStore.putArtifact
                        .withArgs(unzipConfig.buildId, unzipConfig.token, filesName[index], filesContent[index])
                        .resolves({ statusCode: 202 });
                });
            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.deleteZipArtifact.withArgs(unzipConfig.buildId, unzipConfig.token).resolves({ statusCode: 202 });

            await jobs.start.perform(unzipConfig);
            assert.equal(2, spyPromiseAll.callCount);
        });

        it('upload 200 files, limiting the number of parallel uploads to 0', async () => {
            mockery.deregisterAll();
            mockery.resetCache();
            mockStore = {
                getZipArtifact: sinon.stub(),
                putArtifact: sinon.stub(),
                deleteZipArtifact: sinon.stub()
            };
            mockery.registerMock('./helper/request-store', mockStore);
            configMock = {
                get: sinon.stub().returns({ parallelUploadLimit: 0 })
            };
            mockery.registerMock('config', configMock);

            // eslint-disable-next-line global-require
            jobs = require('../../lib/jobs');
            const FILE_NUM = 200;
            const testZip = new AdmZip();
            const filesName = Array(FILE_NUM)
                .fill()
                .map((_, index) => `test-artifact${index}.txt`);
            const filesContent = Array(FILE_NUM)
                .fill()
                .map((_, index) => Buffer.from(`test artifact ${index}`));
            const spyPromiseAll = sinonSandbox.spy(Promise, 'all');

            Array(FILE_NUM)
                .fill()
                .forEach((_, index) => {
                    testZip.addFile(filesName[index], filesContent[index]);
                    mockStore.putArtifact
                        .withArgs(unzipConfig.buildId, unzipConfig.token, filesName[index], filesContent[index])
                        .resolves({ statusCode: 202 });
                });
            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.deleteZipArtifact.withArgs(unzipConfig.buildId, unzipConfig.token).resolves({ statusCode: 202 });

            await jobs.start.perform(unzipConfig);
            assert.equal(1, spyPromiseAll.callCount);
        });

        it('can set the WORKER_PARALLEL_UPLOAD_LIMIT to an integer of character type', async () => {
            mockery.deregisterAll();
            mockery.resetCache();
            mockStore = {
                getZipArtifact: sinon.stub(),
                putArtifact: sinon.stub(),
                deleteZipArtifact: sinon.stub()
            };
            mockery.registerMock('./helper/request-store', mockStore);
            configMock = {
                get: sinon.stub().returns({ parallelUploadLimit: '1' })
            };
            mockery.registerMock('config', configMock);

            // eslint-disable-next-line global-require
            jobs = require('../../lib/jobs');
            const testZip = new AdmZip();
            const spyPromiseAll = sinonSandbox.spy(Promise, 'all');

            testZip.addFile(fileName1, file1);
            testZip.addFile(fileName2, file2);

            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName1, file1)
                .resolves({ statusCode: 202 });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName2, file2)
                .resolves({ statusCode: 202 });
            mockStore.deleteZipArtifact.withArgs(unzipConfig.buildId, unzipConfig.token).resolves({ statusCode: 202 });

            await jobs.start.perform(unzipConfig);
            assert.equal(2, spyPromiseAll.callCount);
        });

        it('raises an error when set not integer to WORKER_PARALLEL_UPLOAD_LIMIT', async () => {
            mockery.deregisterAll();
            mockery.resetCache();
            mockStore = {
                getZipArtifact: sinon.stub(),
                putArtifact: sinon.stub(),
                deleteZipArtifact: sinon.stub()
            };
            mockery.registerMock('./helper/request-store', mockStore);
            configMock = {
                get: sinon.stub().returns({ parallelUploadLimit: 'Not integer value' })
            };
            mockery.registerMock('config', configMock);

            try {
                // eslint-disable-next-line global-require
                jobs = require('../../lib/jobs');
                assert.equal(await jobs.start.perform(unzipConfig), null);
                assert.fail('Never reaches here');
            } catch (err) {
                assert.equal(err.message, 'A value other than an integer is set for WORKER_PARALLEL_UPLOAD_LIMIT.');
            }
        });

        it('raises an error when it failed to get ZIP artifacts', async () => {
            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .throws(new Error('failed to get ZIP artifacts from Store'));

            try {
                await jobs.start.perform(unzipConfig);
                assert.fail('Never reaches here');
            } catch (err) {
                assert.equal(err.message, 'failed to get ZIP artifacts from Store');
            }
        });

        it('raises an error when it failed to put ZIP artifacts', async () => {
            const testZip = new AdmZip();

            testZip.addFile(fileName1, file1);
            testZip.addFile(fileName2, file2);

            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName1, file1)
                .throws(new Error('failed to put an artifact to Store'));

            try {
                await jobs.start.perform(unzipConfig);
                assert.fail('Never reaches here');
            } catch (err) {
                assert.equal(err.message, 'failed to put an artifact to Store');
            }
        });

        // If the deletion of the zip fails, the job itself will not fail.
        // The message of the zip deletion failure will be written in the log.
        it('not raises an error when it failed to delete ZIP artifacts', async () => {
            const testZip = new AdmZip();

            testZip.addFile(fileName1, file1);
            testZip.addFile(fileName2, file2);

            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .resolves({ body: testZip.toBuffer() });
            mockStore.putArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token, fileName2, file2)
                .resolves({ statusCode: 202 });
            mockStore.deleteZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .throws(new Error('failed to delete an artifact to Store'));

            try {
                await jobs.start.perform(unzipConfig);
            } catch (err) {
                assert.fail(err.message, 'Never reaches here');
            }
        });
    });
});
