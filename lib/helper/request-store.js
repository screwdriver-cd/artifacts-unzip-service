'use strict';

const request = require('got');
const ecosystem = require('config').get('ecosystem');
const baseUrl = `${ecosystem.store}/v1`;

const ZIP_FILE = 'SD_ARTIFACT.zip';
const RETRY_LIMIT = 5;

/**
 * Get zip artifact file
 * @method  getZipArtifact
 * @param   {Integer}    buildId    The ID of build that owned the artifacts
 * @param   {String}     token      The token to upload the extracted artifacts
 * @return  {Promise}               An zip object which contains artifacts
 */
const getZipArtifact = async (buildId, token) => {
    const options = {
        url: `${baseUrl}/builds/${buildId}/ARTIFACTS/${ZIP_FILE}`,
        method: 'GET',
        headers: {
            Authorization: token
        },
        retry: {
            limit: RETRY_LIMIT
        },
        responseType: 'buffer'
    };

    try {
        return request(options);
    } catch (err) {
        throw new Error(err.response.body.toString());
    }
};

/**
 * Put unzipped artifact file
 * @method  putArtifact
 * @param  {Integer}  buildId    The ID of build that owned the artifacts
 * @param  {String}   token      The token to upload the extracted artifacts
 * @param  {String}   fileName   File name of the artifact which is to put to store
 * @param  {Buffer}   file       File body of the artifact which is to put to store
 * @return  {Promise}
 */
const putArtifact = async (buildId, token, fileName, file) => {
    const options = {
        url: `${baseUrl}/builds/${buildId}/ARTIFACTS/${fileName}`,
        method: 'PUT',
        headers: {
            Authorization: token,
            'Content-Type': 'text/plain'
        },
        retry: {
            limit: RETRY_LIMIT
        },
        body: file
    };

    try {
        return request(options);
    } catch (err) {
        throw new Error(err.response.body.toString());
    }
};

module.exports = {
    getZipArtifact,
    putArtifact
};
