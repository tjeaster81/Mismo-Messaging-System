const mongoose = require("mongoose");

// dotenv configuration.
require('dotenv').config();

const mbSchema = new mongoose.Schema({
	// realName:
	// A free-form text property containing the "real name," of this User.
	//  Note:  Unlike the username property, the realName property is -NOT-
	//  required.
	//
	// Example:  John Smith
	//
	realName: {
		type: String,
		require: false,
		minLength: [6, 'Real name not long enough; minimum 6 characters.'],
		maxLength: [1024, 'Real name too long.']
	},
	// username:
	// The username assigned to this User.  
	//
	// Example:  john.smith@mismo-messaging.org
	//
	username: {
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
	// password:
	// An array of (previous) passwords; passwords should grow in age as the
	//  index increases.  IOW, password[0] will be a salted hash of the most
	//  recent password; password[1] will be a salted hash of the second most
	//  recently used password, etc.
	//
	// We look to only store the 3 previous passwords.  This is to prevent
	//  users from changing their password back to an already-used value.
	password: {
		type: [String],
		validate: v => {
			//Array.isArray(v) && v.length > 0
			if ( v.length >= Number(process.env.MAX_PASSWORD_RETAIN || 3) ) {
				return false;
			}
		}
	},
	// capabilities:
	// Will contain all-uppercase string representations of various capabilities
	//  that we wish to bestow upon this user.
	//
	// For instance, adding 'USER_CAN_RELAY' to the capabilities array will
	//  result in users authenticated with this username being able to relay
	//  messages within the SMTP Engine.
	capabilities: {
		type: [String],
		validate: v => Array.isArray(v) && v.length > 0
	},
	// storageQuota:
	// Used by the SMTP Engine, when processing the 'RCPT TO' command, to
	//  determine if we should queue this message or return an error indicating
	//  that the mailbox is full. Value is number of bytes.  Setting storageQuota
	//  to 0 (zero) disables the check (infinite storage is allowed to this User).
	//
	// -tje-
	// We're going to set this to 100 MB for the time being.
	//
	// Default: 0
	storageQuota: {
		type: Number,
		default: 100 * (1024 * 1024)
	},
	// added:
	// Timestamp declaring when this user was added to the system.
	added: {
		type: Date,
		default: Date.now(),
	},
	// enabled:
	// Boolean indicating whether this user is active/enabled or not.
	enabled: {
		type: Boolean,
		default: true
	},
	// expires:
	// A timestamp field indicating when this user should no longer be
	//  considered valid.  A value of null ensures that this User never 
	//  expires.
	expires: {
		type: Date,
		default: null
	}
});

module.exports = mbSchema;
