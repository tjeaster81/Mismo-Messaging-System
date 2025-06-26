const mongoose = require("mongoose");

// dotenv configuration.
require('dotenv').config();

const prefsSchema = new mongoose.Schema({
	// username:
	// The username assigned to this User.  
	//
	// Example:  john.smith@mismo-messaging.org
	//
	'username': {
		type: String,
		unique: true,
		require: true,
		minLength: [6, 'Username not long enough; minimum 6 characters.'],
		maxLength: [1024, 'Username too long.'],
		validate: v => {
			if ( !v.includes('@') ) return false;
			[ user, domain ] = v.trim().split('@');

		}
	},
	'initialConfig': {
		type: Date,
		require: true,
		default: Date.now()
	},
	// lastUpdate:
	// A timestamp field indicating the last time this document was
	//  modified.
	'lastUpdate': {
		type: Date,
		default: Date.now()
	},
});

/*
prefsSchema.pre('save', () => console.log('Saving preferences...'));
*/


module.exports = prefsSchema;
