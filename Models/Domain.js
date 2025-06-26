//
// Models/Domain.js
// TJ Easter <sixserpents@protonail.com>
// 01/12/2025
//

const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
	domain: {
		type: String,
		require: true
	},




	//
	// DNS-BASED DOMAIN OWNERSHIP VALIDATION:
	// The Mismo Messaging System validates ownership/control of domains by requiring
	//  the Admin to create/maintain a specific, non-public TXT record at the top-level
	//  of the domain in question.  This record is periodically re-checked (defaults to
	//  every 4 hours) and the 'dnsValidated' boolean adjusted appropriately.  NOTE:
	//  The SMTP Engine will need to include 'dnsValidated == true' in it's list of filters
	//  when querying the database for local domains (i.e., smtp-engine.js:onRcptTo() will
	//  want to check if (a) 'enabled' == true, AND (b) 'expires' is null or in the future,
	//  AND (c) that 'dnsValidated' == true.  The SMTP Engine will fail to see a domain as
	//  local (and therefore accept mail for it) if any of those criteria fail.
	//
	// When
	//
	//
	//
	// It's advisable to set the TTL of this record to no more than 60 seconds because
	//  caching an incorrect value for this record may prevent Mismo from accepting
	//  messages from this domain.
	//
	//
	// 
	// 

	// dnsValidationHostname:
	//
	dnsValidationHostname: {
		type: String,
		require: true,
		minLength: 16,
		maxLength: 256,
		default: 'mismo-dns-validation',
		validate: v => {
			if ( v.indexOf('.') ) {
				message: 'Invalid hostname; do not include the domain name.';
				return false;
			}
			return true;
		}
	},
	// dnsValidationValue:
	//
	dnsValidationValue: {
		type: String,
		require: true,
		minLength: 32,
		maxLength: 32,
		validate: v => {
			if ( v.length !== 32 ) {
				message: 'Invalid value for dnsValidationValue.';
				return false;
			}
			return true;
		}
	},
	// dnsValidationLast:
	//
	dnsValidationLast: {
		type: Date,
		require: true,
		default: null,
		validate: v => {
			if ( v !== null && v > Date.now() ) {
				message: 'Timestamp of last DNS validation cannot be in the future.';
				return false;
			}
			return true;
		}
	},
	dnsValidationFailures: {
		type: Number,
		min: 0,
		max: 2,
		required: true,
		default: 0
	},
	dnsValidated: {
		type: Boolean,
		require: false,
		default: false
	},





	// catchAll:
	// The default mailbox to receive all inbound messages addressed to 
	//  non-existent Mailboxes.  If this value is null, the errant message
	//  will simply be bounced with a 'Mailbox not found' type of error.
	//  If this *is* defined; the errant message will be delivered to this
	//  address and the sender will be none the wiser.
	catchAll: {
		type: String,
		required: false,
		default: null,
		minLength: 4,
		maxLength: 512,
		validate: v => {
			[ user, domain ] = v.trim().split('@');
			if ( user.length === 0 || domain.length === 0 )
			{
				message: 'Invalid catch-all email address provided.';
				return false;
			}
			return true;
		}
	},





	// added:
	// A timestamp of when this domain was added to the system.
	added: {
		type: Date,
		required: false,
		default: Date.now(),
	},
	// addedBy:
	// This is the MismoAdmin admin user's username.
	addedBy:
		{
		type: String,
		required: true,
		default: '(UNKNOWN)',
		minLength: 4,
		maxLength: 512
	},
	





	enabled: {
		type: Boolean,
		default: false
	},






	lastUpdate: {
		type: Date,
		required: false,
		default: Date.now()
	},
	expires: {
		type: Date,
		default: null,
		validate: v => {
			if ( v < Date.now() ) {
				message: 'Expiration must be a future value.';
				return false;
			}
			return true;
		}
	}
});

module.exports = domainSchema;
