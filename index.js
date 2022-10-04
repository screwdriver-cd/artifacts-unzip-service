'use strict';

const Redis = require('ioredis');
const NodeResque = require('node-resque');
const config = require('config');
const logger = require('screwdriver-logger');
const jobs = require('./lib/jobs');
const server = require('./lib/server');
const { connectionDetails, queueNamespace, queuePrefix } = require('./config/redis');
const workerConfig = config.get('unzip-service');
const httpdConfig = config.get('httpd');

let redis;

if (connectionDetails.redisClusterHosts) {
    redis = new Redis.Cluster(connectionDetails.redisClusterHosts, {
        redisOptions: connectionDetails.redisOptions,
        slotsRefreshTimeout: parseInt(connectionDetails.slotsRefreshTimeout, 10),
        clusterRetryStrategy: () => 100
    });
    logger.info('Connecting to Redis Cluster');
} else {
    redis = new Redis(connectionDetails.redisOptions);
    logger.info('Connecting to Redis');
}

const multiWorker = new NodeResque.MultiWorker(
    {
        connection: { redis, namespace: queueNamespace },
        queues: [`${queuePrefix}unzip`],
        minTaskProcessors: workerConfig.minTaskProcessors,
        maxTaskProcessors: workerConfig.maxTaskProcessors,
        checkTimeout: workerConfig.checkTimeout,
        maxEventLoopDelay: workerConfig.maxEventLoopDelay
    },
    jobs
);

const boot = async () => {
    // Start http server for health check
    await server.start(httpdConfig);

    // normal worker emitters
    multiWorker.on('start', workerId => {
        logger.info(`worker[${workerId}] started`);
    });
    multiWorker.on('end', workerId => {
        logger.info(`worker[${workerId}] ended`);
    });
    multiWorker.on('cleaning_worker', (workerId, worker) => {
        logger.info(`cleaning old worker[${workerId}] ${worker}`);
    });
    multiWorker.on('poll', (workerId, queue) => {
        logger.info(`worker[${workerId}] polling ${queue}`);
    });
    multiWorker.on('ping', (workerId, time) => {
        logger.info(`worker[${workerId}] check in @ ${time}`);
    });
    multiWorker.on('job', (workerId, queue, job) => {
        logger.info(`worker[${workerId}] working job ${queue} ${JSON.stringify(job)}`);
    });
    multiWorker.on('reEnqueue', (workerId, queue, job, plugin) => {
        logger.info(`worker[${workerId}] reEnqueue job (${JSON.stringify(plugin)}) ${queue} ${JSON.stringify(job)}`);
    });
    multiWorker.on('success', (workerId, queue, job, result, duration) => {
        logger.info(`worker[${workerId}] job success ${queue} ${JSON.stringify(job)} >> ${result} (${duration}ms)`);
    });
    multiWorker.on('failure', (workerId, queue, job, failure, duration) => {
        logger.info(`worker[${workerId}] job failure ${queue} ${JSON.stringify(job)} >> ${failure} (${duration}ms)`);
    });
    multiWorker.on('error', (workerId, queue, job, error) => {
        logger.info(`worker[${workerId}] error ${queue} ${JSON.stringify(job)} >> ${error}`);
    });
    multiWorker.on('pause', workerId => {
        logger.info(`worker[${workerId}] paused`);
    });

    // multiWorker emitters
    multiWorker.on('multiWorkerAction', (verb, delay) => {
        // Save the last emitted time of this event for health check.
        server.saveLastEmittedTime();
        logger.info(`*** checked for worker status: ${verb} (event loop delay: ${delay}ms)`);
    });

    multiWorker.start();
};

boot();

process.on('unhandledRejection', err => {
    logger.error('Unhandled error', err);
    process.exit(1);
});
