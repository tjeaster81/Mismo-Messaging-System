/*
 * load-balancer.js
 * TJ Easter <sixserpents@protonmail.com>
 * 20250105
 */

global.DEBUG = false

// Mismo Messaging System:
const APP_NAME_SHORT = "Mismo";
const APP_NAME_FULL = "Mismo Messaging System Service Load Balancer (SLB)";
const APP_VERSION = "0.0.1a";
const APP_AUTHOR = "TJ Easter <sixserpents@protonmail.com>";
const APP_WEBSITE = "https://mismo-messaging.org/"

// Basic system-level modules.
const fs = require('fs');
const os = require('os');
const dns = require('dns');
const crypto = require('crypto');

// dotenv configuration.
require('dotenv').config();

// Date/time formatting module.
const date = require('date-and-time');

const Logger = require("bunyan");
const RotatingFileStream = require('bunyan-rotating-file-stream');
log = Logger.createLogger({
	name: APP_NAME_SHORT,
	streams: [
	{
		stream: process.stdout,
		level: 'info'
	},
	{
		type: 'rotating-file',
		path: process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-slb.log',
		period: '1d',           // rotate daily
		count: 7,               // keep a week's worth of logs
		level: 'debug'
	}
]
});


//
// TODO:
// Determine if we really even need MongoDB connectivity from within the SLB code?
//  Having the MongoDB connection established will allow for db-based logging;
//  not having the connection established will result in lesser overhead.
//
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/Mismo').then((ans) => {
	console.log("MongoDB connected successfully @ " + date.format(Date.now(), 'MM/DD/YYYY HH:mm:ss'));
	log.info("MongoDB successfully connected.");
}).catch((err) => {
	console.log("Umable to connect to MongoDB: " + err.message);
	log.fatal("Unable to connect to MongoDB: " + err.message);
});
