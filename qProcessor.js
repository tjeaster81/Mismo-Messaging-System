/*
 * smtp-engine.js
 * TJ Easter <sixserpents@protonmail.com>
 * 20250105
 * 20250106
 */

global.DEBUG = false

// Mismo Messaging System:
const APP_NAME_SHORT = "Mismo";
const APP_NAME_FULL = "Mismo Messaging System Queue Processor";
const APP_VERSION = "0.0.1c";
const APP_AUTHOR = "TJ Easter <sixserpents@protonmail.com>";
const APP_WEBSITE = "https://mismo-messaging.org/"

// Basic system-level modules.
const fs = require('fs');
const os = require('os');
const dns = require('dns');
const crypto = require('crypto');
const cluster = require('cluster');

// dotenv configuration.
require('dotenv').config();

// Date/time formatting module.
const date = require('date-and-time');

// Logging...
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
		path: process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-qProcessor.log',
		period: '1d',			// rotate daily
		count: 7,               // keep a week's worth of logs
		level: 'debug'
	}
	]
});

const mongoose = require("mongoose");
const mongoUrl = Number(process.env.MONGO_URL.length) > 0 ? process.env.MONGO_URL : 'mongodb://localhost/' + APP_NAME_SHORT;
let client = () => {
	return;
}
mongoose.connect(mongoUrl).then((ans) => {
	console.log("Mongoose connected successfully to " + mongoUrl)
	log.info("Successfully connected to Mongoose.");
	if ( typeof mongoose.connection === 'function' ) {
		client = mongoose.connection;
	}
}).catch((err) => {
	console.log("Error connecting to MongoDB: " + err.message)
	log.error("Error connecting to MongoDB: " + err.message);
})




// Include our models...
const Message = require("./Models/Message");
const Domain = require("./Models/Domain");



// If we cannot obtain QUEUE_CYCLE_PERIOD from dotenv, we'll assume
//  the default of 30 seconds.
if ( Number(process.env.QUEUE_CYCLE_PERIOD) > 0 ) {
	queueTimer = process.env.QUEUE_CYCLE_PERIOD * 1000;
} else {
	queueTimer = 30 * 1000;
}

//
//
// The processQueue() function is the real meat-and-potatoes
//  of the qProcessor application; the function is called at
//  regular intervals, finding messages that have
//       state === 'ENQUEUED',
//  and attempting to deliver them via SMTP to their destination
//  server(s).
//
//
setInterval(processQueue, queueTimer);




async function sleep(time) {
	if ( Number(time * 1000) <= 0 ) time = 3000;
	return new Promise((resolve) => setInterval(resolve, (time * 1000)));
}

async function processQueue() {
	log.debug("processQueue(): Initializing...");
	console.debug('processQueue(): Initializing...');
	
	let msgCount = 0;
	let qStart = Date.now();
	let qDocs = 0;
	
	log.debug('processQueue(): mongoose.connection.readyState = ' + mongoose.connection.readyState);
	
	myMessages = mongoose.model('messages', Message);
	await myMessages.find( { state: 'ENQUEUED' } ).exec()
		.then(documents => {
			qDocs = documents.length;
			log.info('processQueue(): Found ' + qDocs + ' emails enqueued.');
			console.log("processQueue(): Found " + qDocs + " emails enqueued.");
			if ( qDocs == 0 ) {
				log.info('processQueue(): Found zero enqueued messages; bailing out.');
				console.log('processQueue(): Found zero enqueued messages; bailing out.');
				return;
			}
			documents.forEach(document => {
				log.debug("processQueue(): Attempting delivery of message ID: " + document.messageId);

				// Skip this message if the document.state has changed
				//  (i.e., no longer set to 'ENQUEUED'.
				if ( document.state !== 'ENQUEUED' ) {
					log.error("processQueue(): document.state CHANGED (ENQUEUED -> " + document.state.toUpperCase() + ") in-flight.  Skipping message.");
					return;
				}

				// Announce ourselves...
				document.headers = 'X-Mismo-Log: Attempting to deliver message ID: ' + 
							document.messageId + ' at ' + date.format(Date.now(), 'MM/DD/YYYY HH:mm:ss') +
							'\n' + document.headers;

				// TODO:
				// (a) Obtain/validate the destination domain name from RCPT TO
				// (b) Obtain MX records for destination domain
				// (c) Attempt to deliver Message to destination via SMTP
				//     (a) If successful, set document.state = 'DELETED'
				//     (b) If unsuccessful, update document.lastDeliveryAttempt = Date.now()
				// (d) 
				//


				// Lock each message as we process it; this will prevent other qProcessors from
				//  trying to deliver the same message.
				document.state = 'LOCKED';
				document.lastDeliveryAttempt = Date.now();
				document.save();

				[ user, domain ] = document.to.trim().toLowerCase().split('@');

				console.log(document.messageId + ': domain = ' + domain + ', user = ' + user);





			})
		.catch(err => {
			console.error(error);
			log.error(error);
		});

		//
		// If we had messages to process, qDocs will be > 0;
		//  for each message that was successfully de-queued/delivered, the
		//  msgCount variable gets incremented.  So, if we actually processed
		//  the messages in MongoDB (i.e., there were enqueued messages to be
		//  processed), we should log our aggregates before bailing out.
		//
		if ( qDocs > 0 && msgCount > 0 ) {
			elapsed = (Date.now() - qStart);
			console.log('Successfully delivered ' + msgCount + '/' + qDocs +
					' messages; runtime: ' + elapsed + ' seconds.');
			log.info('processQueue(): Successfully delivered ' + msgCount + '/' + qDocs +
					' messages; runtime: ' + elapsed + ' seconds.');
		} else {
			console.log('processQueue(): No enqueued messages to deliver at this time.');
			log.info('processQueue(): No enqueued messages to deliver at this time.');
		}







		//
		// log.debug() that the processQueue() function is exiting as the absolute
		//  last thing the processQueue() function does.
		//
		log.debug('processQueue(): Exiting...');
	});	
	








}
