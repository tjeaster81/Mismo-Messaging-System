const mongoose = require("mongoose");

// dotenv configuration.
require('dotenv').config();

const mailboxSchema = new mongoose.Schema({
	// domain:
	// The domain name this mailbox belongs to; this makes writing the admin
	//  interface easier because we cycle through each of the domains associated
	//  with the Admin account and gather statistics about mailboxes residing
	//  at that domain.
	//
	// Example:  mismo-mx.cc
	//
	domain: {
		type: String,
		require: true,
		minLength: [6, 'Domain name not long enough; minimum 6 characters.'],
		maxLength: [1024, 'Domain name too long; maximum of 1024 characters.']
	},
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
		maxLength: [1024, 'Real name too long.'],
		default: "John Doe"
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
			// If we don't contain the @ symbol, reject this insertion.
			if ( v.indexOf('@') == -1 ) {
				message: 'Invalid username provided.';
				return false;
			}
			
			[ user, domain ] = v.trim().split('@');

			// If the user portion of the email address is less than 3 characters
			//  in length, we'll reject the insertion.
			//
			// NOTE: The minimum length of the user portion is set to 3 so that *I*
			//  can have tje@mismo.email.   ;)  According to the website, the user portion
			//  must be -at least- 6 characters in length; but we're only going to enforce
			//  a minLength of 3 at the MongoDB layer.
			//
			if ( user.length < 3 ) {
				message: 'Invalid username provided.';
				return false;
			}

			if ( domain.indexOf('.') == -1 ) {
				message: 'Invalid username provided.';
				return false;
			}

			return true;
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
		type: String,
		validate: v => {
			if ( v.length != 60 ) {
				message: 'Invalid password hash; must be 60-characters.';
				return false;
			}
			return true;
		}
	},
	// gpgPubKey / gpgSecretKey:
	// The public and private (respectively) keys for PGP/GPG-encrypting emails.
	//  These values are not required, but should nearly always be populated; the
	//  MismoAdmin panel generates these keys when a Mailbox is created.
	gpgPublicKey: {
		type: String,
		required: false
	},
	gpgSecretKey: {
		type: String,
		required: false
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
		required: true,
		default: Date.now(),
	},
	// enabled:
	// Boolean indicating whether this user is active/enabled or not.
	enabled: {
		type: Boolean,
		required: true,
		default: true
	},
	// expires:
	// A timestamp field indicating when this user should no longer be
	//  considered valid.  A value of null ensures that this User never 
	//  expires.
	expires: {
		type: Date,
		default: null
	},
	// lastUpdate:
	// A timestamp field indicating the last time this document was
	//  modified.
	//
	//  TODO:
	//  Investigate triggers! It might allow us to update this field
	//   in a manner similar to PostgreSQL triggers (onUpdate, onDelete,
	//   etc.)
	lastUpdate: {
		type: Date,
		default: Date.now()
	},
	// lastLogin:
	// A timestamp field indicating the last time someone authenticated
	//  using this Mailbox.
	lastLogin: {
		type: Date,
		default: null
	}
});

/*
mailboxSchema.pre('save', async function(next) {
	if (!this.isModified('password') || !this.password) {
		return next();
	}
	try {
		salt = await bcrypt.genSalt(14);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch( error ) {
		next(error);
	}
});
*/


mailboxSchema.pre('save', () => console.log('Saving mailbox.'));

module.exports = mailboxSchema;
