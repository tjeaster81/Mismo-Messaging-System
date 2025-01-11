/*
 * smtp-engine.js
 * TJ Easter <sixserpents@protonmail.com>
 * 20241229
 * 20241230
 * 20250101
 * 20250105
 */

global.DEBUG = false

// Mismo Messaging System:
const APP_NAME_SHORT = "Mismo";
const APP_NAME_FULL = "Mismo Messaging System SMTP Engine";
const APP_VERSION = "0.0.2a";
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

// get-fqdn:
// Functionality that returns the fully-qualified domain name
// of the host that we're running on.
const getFQDN = require('get-fqdn');
getFQDN().then(fqdn => {
	console.log('Fully qualified domain name: ' + fqdn);
});

// Global state variable;
//  Here we will keep all kinds of interesting data regarding
//  the state of this application.
global.STATE = {
	activeConns: 0,
	activeSSLConns: 0,
	totalConns: 0,
	totalBytes: 0,
	totalMessages: 0,
	startUp: new Date(),
	ipHashes: {}
};

const Message = require("./Models/Message");
const Domain = require("./Models/Domain");

// Logging (via file);
//   TODO: Logging to MongoDB will come later.
const Logger = require('bunyan');
const RotatingFileStream = require('bunyan-rotating-file-stream');
log = Logger.createLogger({
	name: APP_NAME_SHORT,
	streams: [
		{
			stream: process.stdout,
			level: 'warn'
		},
		{
			type: 'rotating-file',
			path: process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-smtp.log',
			period: '1d',	// rotate daily
			count: 7,		// keep a week's worth of logs
			level: 'info'
		}
	]
});


// The Mongoose module:
const mongoose = require('mongoose');
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
    console.log("Error connecting to Mongoose: " + err.message)
    log.error("Error connecting to Mongoose: " + err.message);
	process.exit(-1);
})

// TODO:
// Query MongoDB to obtain various server variables and
//  statistics and log the data.
try {
	db = client.db(APP_NAME_SHORT);
	mongoStatus = db.command( {serverStatus: 1} );
} catch(error) {
	if ( error instanceof MongoExpiredSessionError ) {
		client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost/' + APP_NAME_SHORT);
		db = client.db(APP_NAME_SHORT);
		mongoStatus = db.command( {serverStatus:1} );
	} else {
		console.log(error);
		log.critical(error);
	}
}

db = client.db(APP_NAME_SHORT);
messagesColl = db.collection('messages');


myCursor = messagesColl.find( { status: 'DELIVERED' } );
count = messagesColl.countDocuments( { status: 'DELIVERED' } );
console.log(count + ' messages in DELIVERED state.');
myCursor.forEach(doc => console.log(doc));

value = messagesColl.valueOf();
console.log('messagesColl: ' + value);









// The express module; necessary for monitoring these services.
//  The various endpoints defined below will return various details
//  about the state of the server (num of active connections, queue
//  size, 1min load average, etc.)
const express = require('express');
const app = express();

app.get('/status', function (req, res) {
	statusObject = {
		uptime: process.uptime(),
		host: {
			hostname: os.hostname(),
			loadAverage: os.loadavg()[0],
			platform: os.type() + ' version ' + os.release() + 
				' running on ' + os.cpus().length + ' ' + os.arch() + ' CPUs',
		},
		application: {
			nodejs: 'NodeJS v' + process.versions.node
		},
		smtp: {
			startUp: date.format(new Date(STATE.startUp),'MM/DD/YYYY HH:mm:ss'),
			activeConns: STATE.activeConns + STATE.activeSSLConns,
			totalConns: STATE.totalConns,
            totalBytes: STATE.totalBytes,
            totalMessages: STATE.totalMessages,
		}
	};

	res.json(statusObject);
});

app.get('/status/detail', function (req, res) {
	statusObject = {
		uptime: process.uptime(),
		host: {
			hostname: os.hostname(),
			loadAverage: os.loadavg()[0],
			freeMem: os.freemem(),
			totalMem: os.totalmem(),
			platform: os.type() + ' version ' + os.release() + 
				' running on ' + os.cpus().length + ' ' + os.arch() + ' CPUs',
		},
		application: {
			nodejs: 'NodeJS v' + process.versions.node,
			smtpPort: process.env.SMTP_PLAIN_PORT || 25,
			smtpSSLPort: process.env.SMTP_TLS_PORT || 587,
			pop3Port: process.env.POP3_PLAIN_PORT || 110,
			pop3SSLPort: process.env.POP3_TLS_PORT || 995

		},
		smtp: {
			startUp: date.format(new Date(STATE.startUp),'MM/DD/YYYY HH:mm:ss'),
			activeConns: STATE.activeConns,
			activeSSLConns: STATE.activeSSLConns,
			totalConns: STATE.totalConns,
			totalBytes: STATE.totalBytes,
			totalMessages: STATE.totalMessages,
			domains: [],
			ipHashes: STATE.ipHashes
		},
		db: {
			version: mongoStatus.version,
			uptime: mongoStatus.uptime,
//			queueSize: db.relayQueue.find({}),
			queueSizeMB: {
				// TODO:  Query MongoDB db.relayQueue to obtain the disk
				//  utilization required for storing the queued, outbound
				//  Messages.
			},
//			messagesStored: db.Messages.find({ disabled: { $not: /true/i }}).count(),
			messagesStoredMB: {
				// TODO:  Query MongoDB db.Messages to obtain the disk
				//  utilization required for storage.
			}
		}
	};
	collection = db.collection('Domains')
	myCursor = collection.find({ });
	myCursor.forEach( function(doc) {
		statusObject.smtp.domains.append(doc.domain);
	});
	myCursor.close();
	res.json(statusObject);
});
app.get('/logs', function(req, res) {
	switch(req.query.log.toLowerCase()) {
		case 'smtp':
			logFile = process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-smtp.log';
			break;
		case 'slb':
			logFile = process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-slb.log';
			break;
		case 'qproc':
		case 'qprocessor':
			logFile = process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-qprocessor.log';
			break;
		default:
			// We default to the SMTP Engine's logfile, if 'log' isn't passed in the
			//  QUERY STRING (req.query.log).
			logFile = process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-smtp.log';
	}
	res.sendFile(logFile);
});
// Return a 403 Forbidden status code to all other URLs:
app.get('*', function(req, res) {
	return res.status(403).json( { message: 'Forbidden' } );
});
// Return a 405 Method Not Implemented if user tries to POST:
app.post("*", function(req, res) {
	return res.status(405).json( { message: 'Request method unsupported' } );
});
app.listen(process.env.HTTP_STATUS_PORT || 3005, function() {
	log.info('Successfully started express on port ' + process.env.HTTP_STATUS_PORT || 3005);
});



// MailParser; this allows us to slurp up the raw SMTP session
//  data and put it into a usable object.
const simpleParser = require('mailparser').simpleParser;


// The smtp-server module; this module provides just enough MTA
//  functionality to respond correctly to a remote MTA and get
//  us the message.
const SMTPServer = require("smtp-server").SMTPServer;
const SMTPServiceOptions = {
	logger: log,
	name: APP_NAME_SHORT,
	banner: '[' + fqdn + '] ' + APP_NAME_FULL + ' v' + 
		APP_VERSION + ' online at ' + date.format(new Date, 'MM/DD/YYYY HH:mm:ss') + '.',
	size: (process.env.SMTP_MAX_MESSAGE_SIZE * (1024 * 1024)),
	authMethods: [ 'PLAIN', 'LOGIN', 'CRAM-MD5' ],
	authOptional: true,
	allowInsecureAuth: false,
	maxClients: process.env.SMTP_MAX_CLIENTS > 0 ? process.env.SMTP_MAX_CLIENTS : '',
	socketTimeout: (process.env.SOCKET_TIMEOUT * 1000),
	closeTimeout: (process.env.CLOSE_TIMEOUT * 1000),
	onConnect(session, callback) {
		// TODO:  rate-limiting

		// per-IP connection limiting, if enabled
		if ( process.env.SMTP_MAX_CLIENTS_PER_HOST !== '' ) {
			ipHash = crypto.createHash('sha1')
				.update(session.remoteAddress)
				.digest('hex');
			if (!(ipHash in STATE.ipHashes)) {
				STATE.ipHashes[ipHash] = {
					remoteAddress: session.remoteAddress,
					connections: 0
				};
			}
			if ( STATE.ipHashes[ipHash].connections >= process.env.SMTP_MAX_CLIENTS_PER_HOST ) {
				// We return an error to the client, setting the response code to
				// 421 (Service not available), then closing the connection.
				err = new Error("Too many connections (" + STATE.ipHashes[ipHash].connections +
						" of " + process.env.SMTP_MAX_CLIENTS_PER_HOST +
						") from this host: " + session.remoteAddress);
				err.responseCode = 421;
				return callback(err);
			} else {
				STATE.ipHashes[ipHash].connections = STATE.ipHashes[ipHash].connections + 1;
			}
		}
			
		// TODO:  Check the EHLO parameter, in session.openingCommand, to
		//  ensure that the hostname the client provided matches what
		//  DNS returns from looking up the client IP (session.clientHostname)
		//
		// FIXME:
		//  Oddly enough, 'session.openingCommand' is set to 'false'.  Wonder why?
		STATE.activeConns = STATE.activeConns + 1;
		log.info('Accepted SMTP connection from ' + session.remoteAddress +
			'; Session ID: ' + session.id);
		return callback();
	},
	onClose(session) {
		if ( process.env.SMTP_MAX_CLIENTS_PER_HOST != '' ) {
			ipHash = crypto.createHash('sha1')
				.update(session.remoteAddress)
				.digest('hex');
			if ( ipHash in STATE.ipHashes ) {
				STATE.ipHashes[ipHash].connections = STATE.ipHashes[ipHash].connections - 1;
				if ( STATE.ipHashes[ipHash].connections <= 0 ) {
					delete(STATE.ipHashes[ipHash]);
				}
			} else{
				// Something is wrong here!  This client should be known to the STATE.ipHashes array
				console.log(ipHash + ' not found in STATE.ipHashes; weird!');
				log.warn(ipHash + ' not found in STATE.ipHashes; weird!');
			}
		}
		STATE.activeConns = STATE.activeConns - 1;
		console.log('Client ' + session.remoteAddress + ' disconnected; ' +
				(session.transaction - 1) + ' messages transmitted.');
		log.info('Client ' + session.remoteAddress + ' disconnected; ' +
				(session.transaction - 1) + ' messages transmitted.');
	},
	onMailFrom(address, session, callback) {
		[ user, domain ] = address.address.trim().split('@');

		// FIXME:
		// The db object is not defined here.  WTF?
		collection = db.collection('Domains');
		myCursor = collection.find({domain: domain});
		myCursor.forEach( (doc) => {
			console.log(doc.domain);
		});
		//console.log(myCursor.countDocuments({domain: domain}));

		return callback();
	},
	onRcptTo(address, session, callback) {
		[ user, domain ] = address.address.trim().split('@');

		return callback();
	},
	onData(stream, session, callback) {
		let emailData = '';
		stream.on('data', (chunk) => {
			emailData += chunk;
		});
		stream.on("end", () => {
			let err;
			if ( stream.sizeExceeded ) {
				err = new Error("Message exceeds maximum configured size");
				err.responseCode = 552;
				handleError(err);
				return callback(err);
			}
			STATE.totalBytes += emailData.length;
		console.log('emailData: ');
		console.log(emailData);
			simpleParser(emailData)
				.then(parsed => {
					parsed.messageId = crypto.createHash('sha1').update(emailData + Date.now()).digest('hex') + '@' + os.hostname();
					console.log(session.remoteAddress + ' submitted message ID: ' +
						parsed.messageId + '; ' + emailData.length + ' bytes transmitted.');
					log.info(session.remoteAddress + ' submitted message ID: ' +
						parsed.messageId + '; ' + emailData.length + ' bytes transmitted.');
					
					// TODO:
					// This is where we'll populate a new Message object with various values
					//  obtained from the SMTP session; then we'll save the document to the
					//  database.
					//
					emailHeaders = emailData.split(/\n\n/)[0];
		console.log('emailHeaders: ' + emailHeaders);
					Message.create( {
						headers: emailHeaders,
						body: parsed.text,
						to: parsed.to.text,
						from: parsed.from.text,
						subject: parsed.subject,
						messageId: parsed.messageId,
						tags: [ 'UNREAD' ],
						folder: 'Inbox',
						state: 'ENQUEUED',
						accepted: Date.now()
					} ).then(result => {
						console.log(result);
					});

					callback(null, 'Message ID ' + parsed.messageId + ' accepted at ' + date.format(new Date, 'MM/DD/YYYY HH:mm:ss'));
				})
				.catch(err => {
					handleError(err);
					err = new Error('Could not parse email message.');
					err.responseCode(501);
					return callback(err);
				});
		});
	}
};
const SMTPServiceOptionsSSL = {
	secure: true,
	cert: fs.readFileSync(process.env.SMTP_TLS_CERT),
	key: fs.readFileSync(process.env.SMTP_TLS_KEY),
	logger: log,
	name: APP_NAME_SHORT,
	banner: '[' + fqdn + '] ' + APP_NAME_FULL + ' v' + 
		APP_VERSION + ' online at ' + date.format(new Date, 'MM/DD/YYYY HH:mm:ss') + '.',
	size: (process.env.SMTP_MAX_MESSAGE_SIZE * (1024 * 1024)),
	authMethods: [ 'PLAIN', 'LOGIN' ],
	authOptional: true,
	allowInsecureAuth: false,
	maxClients: process.env.SMTP_MAX_CLIENTS > 0 ? process.env.SMTP_MAX_CLIENTS : '',
	socketTimeout: (process.env.SOCKET_TIMEOUT * 1000),
	closeTimeout: (process.env.CLOSE_TIMEOUT * 1000),
	onConnect(session, callback) {
		// TODO:
		// This would be a good place to implement connection rate-limiting,
		//  limits per client, and max clients per host.
		STATE.activeSSLConns = STATE.activeConns + 1;
		STATE.totalConns = STATE.totalConns + 1;
		log.info('Accepted SMTP/TLS connection from ' + session.remoteAddress +
				'; Session ID: ' + session.id);
	},
	onClose(session) {
		STATE.activeConns = STATE.activeConns - 1;
		log.info('Client ' + session.remoteAddress + ' disconnected; ' +
				session.transaction + ' messages transmitted.');
	},
	onMailFrom(address, session, callback) {
		[ user, domain ] = address.address.split('@');
		
		return callback();
	},
	onRcptTo(address, session, callback) {
		[ user, domain ] = address.address.split('@');

		return callback();
	},
	onData(stream, session, callback) {
		let emailData = '';
		stream.on('data', (chunk) => {
			emailData += chunk;
		});
		stream.on("end", () => {
			let err;
			if ( stream.sizeExceeded ) {
				err = new Error("Message exceeds maximum configured size");
				err.responseCode = 552;
				return callback(err);
			}
			STATE.totalBytes += emailData.length;

			// Let's get a look at what the client sent us:
			console.log('emailData:');
			console.log(emailData);

			simpleParser(emailData, { })
				.then(parsed => {
					log.info(session.remoteAddress + ' submitted message ID: ' + parsed.messageId +
						'; ' + emailData.length + ' bytes transmitted');

			callback(null, 'Message ID: ' + session.messageId +
					' accepted at ' + date.format(new Date, 'MM/DD/YYYY HH:mm:ss'));
		});

	}
};

handleError = (err) => {
	if ( DEBUG ) {
		log.debug(err.name + ' ' + err.message + ';' + err.stack);
	}
	log.error(err.name + ' ' + err.message);
	console.log(err.name + ' ' + err.message);
};

smtp = new SMTPServer( SMTPServiceOptions );
smtp.on("error", handleError);
smtpSSL = new SMTPServer( SMTPServiceOptionsSSL );
smtpSSL.on("error", handleError);
smtp.listen(process.env.SMTP_PLAIN_PORT || 25);
console.log('Successfully started SMTP service on port ' + process.env.SMTP_PLAIN_PORT || 25);
log.info('Successfully started SMTP service on port ' + process.env.SMTP_PLAIN_PORT || 25);
STATE.startUp = Date.now();
smtpSSL.listen(process.env.SMTP_TLS_PORT || 587);
console.log('Successfully started SMTP/TLS service on port ' + process.env.SMTP_TLS_PORT || 587);
log.info('Successfully started SMTP/TLS service on port ' + process.env.SMTP_TLS_PORT || 587);
