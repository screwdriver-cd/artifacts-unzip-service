'use strict';

const logger = require('screwdriver-logger');
const AdmZip = require('adm-zip');
const { Plugins } = require('node-resque');
const unzipService = require('config').get('unzip-service');
const store = require('./helper/request-store');

const RETRY_LIMIT = 3;
// This is in milliseconds, reference: https://github.com/actionhero/node-resque/blob/fe89056671af32e35695332b248c1df1e422431e/src/plugins/Retry.ts#L23
const RETRY_DELAY = 5 * 1000;
const PARALLEL_UPLOAD_LIMIT = Number(unzipService.parallelUploadLimit);

if (!Number.isInteger(PARALLEL_UPLOAD_LIMIT)) {
    throw new Error('A value other than an integer is set for WORKER_PARALLEL_UPLOAD_LIMIT.');
}

const retryOptions = {
    retryLimit: RETRY_LIMIT,
    retryDelay: RETRY_DELAY
};

logger.info(`The setting value of PARALLEL_UPLOAD_LIMIT is ${PARALLEL_UPLOAD_LIMIT}`);

/**
 * Extract data from the zip file and upload to store.
 * @method _uploadToStore
 * @param buildId {Integer} The ID of build that owned the artifacts
 * @param token {String} The token to upload the extracted artifacts
 * @param zipEntry
 * @returns {Promise}
 */
async function _uploadToStore(buildId, token, zipEntry) {
    const fileName = zipEntry.entryName;
    const file = Buffer.from(zipEntry.getData());

    return store.putArtifact(buildId, token, fileName, file);
}

/**
 * Unzip ZIP artifacts and re-uploads the extracted artifacts to Store
 * @method unzip
 * @param  {Object}   config           Configuration object
 * @param  {Integer}  config.buildId   The ID of build that owned the artifacts
 * @param  {String}   config.token     The token to upload the extracted artifacts
 * @return {Promise}
 */
async function unzip(config) {
    logger.info(`Job:unzip started. buildId: ${config.buildId}`);

    try {
        const zipFile = await store.getZipArtifact(config.buildId, config.token);
        const zipBuffer = new AdmZip(zipFile.body);
        const zipEntries = zipBuffer.getEntries();

        if (PARALLEL_UPLOAD_LIMIT <= 0) {
            await Promise.all(zipEntries.map(zipEntry => _uploadToStore(config.buildId, config.token, zipEntry)));
        } else {
            while (zipEntries.length > 0) {
                // eslint-disable-next-line no-await-in-loop
                await Promise.all(
                    zipEntries
                        .splice(0, PARALLEL_UPLOAD_LIMIT)
                        .map(zipEntry => _uploadToStore(config.buildId, config.token, zipEntry))
                );
            }
        }
    } catch (err) {
        logger.error(err.message);
        throw err;
    }

    try {
        await store.deleteZipArtifact(config.buildId, config.token);
    } catch (err) {
        logger.error(err.message);
    }

    logger.info(`Job:unzip finished. buildId: ${config.buildId}`);
}

module.exports = {
    start: {
        plugins: [Plugins.Retry],
        pluginOptions: {
            Retry: retryOptions
        },
        perform: unzip
    }
};
