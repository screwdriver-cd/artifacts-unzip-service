'use strict';

const Hapi = require('@hapi/hapi');
const logger = require('screwdriver-logger');

let lastEmittedTime = null;

const saveLastEmittedTime = () => {
    const date = new Date();
    lastEmittedTime = Math.floor(date.getTime() / 1000);
}

const start = async (config) => {
    try {
        const server = new Hapi.Server({
            port: config.port,
            host: config.host,
            uri: config.uri,
            routes: {
                log: { collect: true }
            },
            router: {
                stripTrailingSlash: true
            }
        });

        server.route([
            {
                method: 'GET',
                path: '/last-emitted',
                config: {
                    description: 'Last emitted time of the "multiWorkerAction" event.',
                    notes: 'Should respond unixtime with 200',
                    tags: ['api']
                },
                handler(request, h) {
                    if (lastEmittedTime) {
                        return h.response(lastEmittedTime).code(200);
                    }

                    return h.response('Can not get lastEmittedTime').code(503);
                }
            }
        ]);

        await server.start();
        logger.info('Server running on %s', server.info.uri);

        return server;
    } catch (err) {
        logger.error(`Error in starting server ${err}`);
        throw err;
    }
};

module.exports = {
    start,
    saveLastEmittedTime
}
