'use strict';

const logger = require('screwdriver-logger');
const plugins = require('node-resque').Plugins;
const AdmZip = require('adm-zip');

const store = require('./helper/request-store');

const RETRY_LIMIT = 3;
// This is in milliseconds, reference: https://github.com/taskrabbit/node-resque/blob/master/lib/plugins/Retry.js#L12
const RETRY_DELAY = 5 * 1000;

const retryOptions = {
    retryLimit: RETRY_LIMIT,
    retryDelay: RETRY_DELAY
};

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

        await Promise.all(
            zipEntries.map(async zipEntry => {
                const fileName = zipEntry.entryName;
                const file = Buffer.from(zipEntry.getData());

                return store.putArtifact(config.buildId, config.token, fileName, file);
            })
        );
    } catch (err) {
        logger.error(err.message);
        throw err;
    }

    logger.info(`Job:unzip finished. buildId: ${config.buildId}`);

    return null;
}

module.exports = {
    unzip: {
        plugins: [plugins.Retry],
        pluginOptions: {
            Retry: retryOptions
        },
        perform: unzip
    }
};
