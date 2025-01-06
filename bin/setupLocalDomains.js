/*
 * bin/setupLocalDomaims.js
 * TJ Easter <sixserpents@protonmail.com>
 * 20250106
 */

global.DEBUG = false;

// Mismo Messaging System:
const APP_NAME_SHORT = "Mismo";
const APP_NAME_FULL = "Mismo Messaging System bin/setLocalDomains.js";
const APP_VERSION = "0.0.1a";
const APP_AUTHOR = "TJ Easter <sixserpents@protonmail.com>";
const APP_WEBSITE = "https://mismo-messaging.org/"

const fs = require('fs');
const os = require('os');

// dotenv configuration.
require('dotenv').config();

// Date/time formatting module.
const date = require('date-and-time');

domainList = 'localDomains.txt';
domListStr = fs.readFileSync(domainList);
localDomains = domListStr.toString().split(/\n/);

const mongoose = require("mongoose");
const mongoUrl = typeof process.env.MONGO_URL === 'String' ? process.env.MONGO_URL : 'mongodb://localhost/' + APP_NAME_SHORT;
let client = () => {
	return;
}
mongoose.connect(mongoUrl).then((ans) => {
	console.log("Mongoose connected successfully to " + mongoUrl)
	if ( typeof mongoose.connection === 'function' ) {
		client = mongoose.connection;
	}
}).catch((err) => {
	console.log("Error connecting to MongoDB: " + err.message)
})

const Domain = require('../Models/Domain');
dom = mongoose.model('domains', Domain);

// Blast any existing 'domains' collection that might exist
//  This ensures that no documents exist within the 'domains' collection
//  when we go to do the initial configuration.
dom.deleteMany( { } )
	.then( (result) => {
		console.log('Removed ' + result.deletedCount + ' domains.');
	});

let domCount = 0;
localDomains.forEach(line => {
	if ( line.startsWith('#') ) return;
	if ( line.length <= 0 ) return;
	
	dName = line.split(/\s+/)[0];
	dName = dName.toLowerCase();
	
	dom.create( {
		domain: dName,
		added: Date.now(),
		enabled: true,
		expires: null
	})
	.then(domAdded => {
		console.log('Domain added: ', domAdded);
		domCount = domCount + 1;
	})
	.catch(err => console.error('Error adding domain ' + dName + ': ' + err.message));

	console.log('Added domain ' + line.split(/\s+/)[0] + ' to MongoDB.');
});

console.log('Added ' + domCount + ' domains for local delivery.');
