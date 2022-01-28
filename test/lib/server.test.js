'use strict';

const assert = require('assert');
const server = require('../../lib/server');

const serverConfig = {
    port: 80,
    host: '0.0.0.0'
};

describe('GET /last-emitted', () => {
    let serverInstance;
    const requestParam = {
        method: 'get',
        url: '/last-emitted'
    };

    afterEach(async () => {
        await serverInstance.stop();
    });

    it('responds with 503', async () => {
        serverInstance = await server.start(serverConfig);
        const res = await serverInstance.inject(requestParam);

        assert.equal(res.result, 'Can not get lastEmittedTime');
        assert.equal(res.statusCode, 503);
    });

    it('responds with 200', async () => {
        serverInstance = await server.start(serverConfig);
        server.saveLastEmittedTime();
        const res = await serverInstance.inject(requestParam);

        assert.equal(res.statusCode, 200);
    });
});
