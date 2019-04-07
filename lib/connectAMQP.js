'use strict';

const amqplib = require('amqplib');

require('dotenv').config();

const connectionPromise = amqplib.connect(process.env.RABBITMQ_URL);

module.exports = connectionPromise;
