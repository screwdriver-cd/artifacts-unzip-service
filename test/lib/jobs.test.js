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

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        mockStore = {
            getZipArtifact: sinon.stub(),
            putArtifact: sinon.stub()
        };
        mockery.registerMock('./helper/request-store', mockStore);

        // eslint-disable-next-line global-require
        jobs = require('../../lib/jobs');
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

            assert.equal(await jobs.unzip.perform(unzipConfig), null);
        });

        it('raises an error when it failed to get ZIP artifacts', async () => {
            mockStore.getZipArtifact
                .withArgs(unzipConfig.buildId, unzipConfig.token)
                .throws(new Error('failed to get ZIP artifacts from Store'));

            try {
                await jobs.unzip.perform(unzipConfig);
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
                await jobs.unzip.perform(unzipConfig);
                assert.fail('Never reaches here');
            } catch (err) {
                assert.equal(err.message, 'failed to put an artifact to Store');
            }
        });
    });
});
