/* jshint esversion: 8 */

/*
 * pop3d-ssl.js
 * TJ Easter <sixserpents@protonmail.com>
 * 20250527-1107
 * 20250604-0139
 *
 *
 *
 */

// Mismo Messaging System:
global.APP_NAME_SHORT = "Mismo";
global.APP_NAME_FULL = "Mismo Messaging System POP3+TLS Daemon";
global.APP_VERSION = "0.1.0a";
global.APP_AUTHOR = "TJ Easter <sixserpents@protonmail.com>";
global.APP_WEBSITE = "https://mismo-messaging.org/";


// Common modules
const net = require('net');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const tls = require('tls');
const cluster = require('cluster');
const process = require('process');

// strftime:
// Format date/time strings.
const strftime = require('strftime');

// dotenv configuration.
require('dotenv').config();

// Used to determine the size (in bytes) of a message.
const bson = require('bson');

// fqdn:
// This string is used to calculate MessageIDs, for logging our receipt
//  of this message in the message headers, and various other places.
fqdn = process.env.FQDN || os.hostname();
fqdn = fqdn.trim().toLowerCase();
if ( fqdn.indexOf('.') == -1 ) {
                // We got only the hostname, not the fully qualified domain name
                console.error('Unable to obtain the fully qualified domain name.');
                console.error('Please set "FQDN" in the .env configuration file.');
                process.exit(-1);
}


// Define which TCP port we're going to listen on
//  Defaults to 995 for POP3+TLS.
const POP3_PORT = (process.env.POP3_TLS_PORT || 995);


// Logging (via file);
//   TODO: Logging to MongoDB will come later.
const Logger = require('bunyan');
const RotatingFileStream = require('bunyan-rotating-file-stream');
log = Logger.createLogger({
	name: APP_NAME_SHORT,
	streams: [
		{ stream: process.stdout, level: 'info' },
		{
			type: 'rotating-file',
			path: process.env.LOG_PATH + '/' + APP_NAME_SHORT.toLowerCase() + '-pop3d-tls.log',
			period: '1d',					// Keep 1 days worth of logs per logfile
			count: 7,						// Keep 1 week's worth of logfiles
			level: 'info'
		}
	]
});
	
// The Mongoose module:
const mongoose = require('mongoose');
const mongoUrl = Number(process.env.MONGO_URL.length) > 0 ? process.env.MONGO_URL : 'mongodb://localhost/' + APP_NAME_SHORT;
mongoose.connect(mongoUrl).then((ans) => {
        console.log("Mongoose connected successfully to " + mongoUrl);
        log.info("Successfully connected to Mongoose.");
}).catch((err) => {
    console.log("Error connecting to Mongoose: " + err.message);
    log.error("Error connecting to Mongoose: " + err.message);
        process.exit(-1);
});


// Load our Mongoose schemas
MailboxSchema = require('./Models/Mailbox');
mailboxes = mongoose.model('mailboxes', MailboxSchema);
MessageSchema = require('./Models/Message');
messages = mongoose.model('messages', MessageSchema);
LogSchema = require('./Models/Log');
dbLog = mongoose.model('logs', LogSchema);
AttachmentSchema = require('./Models/Attachment');
dbAttachments = mongoose.model('attachments', AttachmentSchema);

function getTimestamp() {
        return strftime('%Y%m%d-%H%M%S.%L');
}

const handle_USER = require('./pop3/handle_USER');
const handle_PASS = require('./pop3/handle_PASS');
const handle_STAT = require('./pop3/handle_STAT');
const handle_LIST = require('./pop3/handle_LIST');
const handle_UIDL = require('./pop3/handle_UIDL');
const handle_RETR = require('./pop3/handle_RETR');
const handle_DELE = require('./pop3/handle_DELE');
const handle_NOOP = require('./pop3/handle_NOOP');
const handle_RSET = require('./pop3/handle_RSET');
const handle_TOP  = require('./pop3/handle_TOP');
const handle_CAPA = require('./pop3/handle_CAPA');
const handle_QUIT = require('./pop3/handle_QUIT');

tlsOptions = {
	key: fs.readFileSync(process.env.POP3_TLS_KEY || '/opt/Mismo/ssl/pop3d-key.pem'),
	cert: fs.readFileSync(process.env.POP3_TLS_CERT || '/opt/Mismo/ssl/pop3d-cert.pem'),
	ca: fs.readFileSync('/etc/ssl/certs/ca-certificates.crt'),

	// We won't want to keep this set to false.  Setting it to false allows us to
	//  establish the TLS connection even if the certificate is expired/CN mismatch.
	//  For now, it's set to false to aid in troubleshooting TLS issues during development. 
	rejectUnauthorized: false,

	// Force clients to use -at least- TLS v1.3 (the latest as of 20250527) to avoid
	//  any of the weaknesses found in previous versions.  Notice that we do not set a
	//  'maxVersion' (though we could); as long as it's -at least- TLS v1.3, we're good.
	minVersion: 'TLSv1.3',

	// The time, in ms, that the TLS handshake should be completed by; otherwise, we'll
	//  timeout.  Default is 120,000 (120 sec); set to 15,000 (15 sec).
	handshakeTimeout: 15000,

	// Enable keep-alive on the socket.  The socket must be idle for five (5) seconds
	//  (as specified by keepAliveInitialDelay) before the first keep-alive probe will
	//  be sent.
	//keepAlive: true,
	//keepAliveInitialDelay: 5
	keepAlive: false
};

if ( cluster.isPrimary ) {
	console.log('Primary (PID: ' + process.pid + ') is running.');
	log.info('Primary (PID: ' + process.pid + ') is running.');
	dbLog.create({
		'application': APP_NAME_FULL,
		'ts': Date.now(),
		'host': fqdn,
		'pid': process.pid,
		'message': 'Primary process (PID: ' + process.pid + ') initializing...\n' +
			'About to spawn ' + process.env.POP3_MAX_TLS_PROCESSES + ' worker processes.'
	});

	for ( i = 0 ; i < process.env.POP3_MAX_TLS_PROCESSES ; i++ ) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log('Worker ' + worker.process.pid + ' died.');
		log.info('Worker ' + worker.process.pid + ' died.');
		dbLog.create({
			'application': APP_NAME_FULL,
			'ts': Date.now(),
			'host': fqdn,
			'pid': process.pid,
			'message': 'Worker (PID: ' + worker.process.pid + ') died.'
		});
	});

//
// cluster.isPrimary
//   ELSE
// !cluster.isPrimary (worker process)
//
} else {
	console.log('Worker (PID: ' + process.pid + ') initializing...');
	log.info('Worker (PID: ' + process.pid + ') initializing...');
	dbLog.create({
		'application': APP_NAME_FULL,
		'ts': Date.now(),
		'host': fqdn,
		'pid': process.pid,
		'message': 'Worker (PID: ' + process.pid + ') initializing...'
	});

	const server = tls.createServer(tlsOptions, async (socket) => {
		cipher = socket.getCipher();
		console.log('Client connected from ' + socket.remoteAddress + ':' + socket.remotePort + ' using ' + cipher.name + ' over ' + cipher.version);
		log.info('Client connected from ' + socket.remoteAddress + ':' + socket.remotePort + ' using ' + cipher.name + ' over ' + cipher.version);
		dbLog.create({
			'application': APP_NAME_FULL,
			'ts': Date.now(),
			'host': fqdn,
			'pid': process.pid,
			'message': 'Client connected from ' + socket.remoteAddress + ':' + socket.remotePort + ' using ' + cipher.name + ' over ' + cipher.version
		});

		// Two global variables, used to track whether the user has been authenticated, and if so, with
		//  what username?
		global.isAuthenticated = false;
		global.authUsername = null;

 		idleTimeout = setTimeout(() => {
 			socket.write('+OK Idle connection timed out.\r\n');
 			socket.end();
 		}, 30000);

		// Greet the client
		socket.write('+OK ' + APP_NAME_FULL + ' at ' + fqdn + ' ready.\r\n');

		socket.on('data', async (data) => {
			const clientData = data.toString().trim();
			const command = clientData.split(' ')[0];

			clearTimeout(idleTimeout);
			idleTimeout = setTimeout(() => {
				socket.write('+OK Idle connection timed out.\r\n');
				socket.end();
			}, 30000);

			switch(command.toUpperCase()) {
				// CASE USER
				case 'USER':
					ret = await handle_USER(socket, clientData);
					if ( typeof ret == 'string' ) {
						authUsername = ret;
					}
					break;

				// CASE PASS
				case 'PASS':
					ret = await handle_PASS(socket, clientData);
					if ( ret == true ) isAuthenticated = true;
					break;

				// CASE STAT
				case 'STAT':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = await handle_STAT(socket);
					break;
				case 'LIST':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = await handle_LIST(socket, clientData);
					break;
				case 'UIDL':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = await handle_UIDL(socket);
					break;
				case 'RETR':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = handle_RETR(socket, clientData);
					break;
				case 'DELE':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = handle_DELE(socket, clientData);
					break;
				case 'NOOP':
					if ( ! isAuthenticated ) {
						socket.write('-ERR Please authenticate first.\r\n');
						break;
					}
					ret = handle_NOOP(socket,isAuthenticated,authUsername);
					break;
				case 'RSET':
					ret = handle_RSET(socket);
					if ( ret == true ) {
						socket.write('-ERR Command RSET not supported.\r\n');
						break;
					}
					break;
				case 'TOP':
					if ( ! isAuthenticated ) {
						socket.write('-ERR [Please authenticate first.]\r\n');
						break;
					}
					[ topCmd, msgNumber, msgLines ] = clientData.trim().split(' ');
					ret = handle_TOP(socket, msgNumber, msgLines);
					break;
				case 'CAPA':
					ret = handle_CAPA(socket);
					break;
				case 'QUIT':
					ret = handle_QUIT(socket);
					if ( ret ) {
						server.close();
						dbLog.create({
							'application': APP_NAME_FULL,
							'ts': Date.now(),
							'host': fqdn,
							'pid': process.pid,
							'message': 'Client ' + socket.remoteAddress + ' disconnecting.'
						});
					}
					break;
				default:
					socket.write('-ERR Unrecognized command: ' + command);
					dbLog.create({
						'application': APP_NAME_FULL,
						'ts': Date.now(),
						'host': fqdn,
						'pid': process.pid,
						'message': 'Client ' + socket.remoteAddress + ' [user: ' + isAuthenticated ? authUsername : '(unauthenticated)' +
							'] issued unknown command: ' + clientData.trim()
					});
					break;
			}

		// End of socket.on('data')
		});

		socket.on('close', () => {
			console.log('[' + getTimestamp() + '] Client ' + socket.remoteAddress + ' disconnected');
			log.info('[' + getTimestamp() + '] Client ' + socket.remoteAddress + ' disconnected');
			dbLog.create({
				'application': APP_NAME_FULL,
				'ts': Date.now(),
				'host': fqdn,
				'pid': process.pid,
				'message': 'Client ' + socket.remoteAddress + ' (user: ' +
					(isAuthenticated ? authUsername : '(unauthenticated)') + ') disconnected.'
			});
			authUsername = null;
			isAuthenticated = false;
		});

		socket.on('error', (error) => {
			console.error('Socket error:' + error);
			log.error('Socket error:' + error);
			dbLog.create({
				'application': APP_NAME_FULL,
				'ts': Date.now(),
				'host': fqdn,
				'pid': process.pid,
				'message': 'Socket error: ' + error
			});
			socket.end();
		});

	// end of const tls.createServer()
	});
	
	// We set the max connections in the .env file as POP3_MAX_TLS_CLIENTS;
	//  or, if not, we default to 16 simultaneous clients.
	server.maxConnections = (process.env.POP3_MAX_TLS_CLIENTS || 16);
	server.listen(POP3_PORT, () => {
		console.log('POP3+TLS server listening on port ' + POP3_PORT);
		log.info('POP3+TLS server listening on port ' + POP3_PORT);
		dbLog.create({
			'application': APP_NAME_FULL,
			'ts': Date.now(),
			'host': fqdn,
			'pid': process.pid,
			'message': 'POP3+TLS server listening on port ' + POP3_PORT
		});
	});


// End of if(isPrimary)/else
}

