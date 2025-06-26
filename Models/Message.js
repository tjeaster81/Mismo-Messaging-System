const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
	raw: {
		type: String,
		require: false,
		validate: v => {
			if ( v.length > 1048576 ) {
				message: 'Raw session too large for storage.';
				return false;
			}
			
			return true;
		}
	},
	headers: {
		type: String,
		require: true
	},
	body: {
		type: String,
		require: true
	},
	to: {
		type: String,
		require: true
	},
	// Since the 'to' variable may contain an array of email addresses (including the
	//  possibility that our local recipient isn't even in the list [i.e., mailing lists])
	//  we have a 'delivered_to' field which should contain the RCPT TO recipient.
	delivered_to: {
		type: String,
		require: true
	},
	from: {
		type: String,
		require: true
	},
	subject: {
		type: String,
		require: true,
		default: '(unspecified)'
	},
	messageId: {
		type: String,
		require: true
	},
	tags: [String],
	folder: {
		type: String,
		require: true,
		default: 'Inbox'
	},
	domain: {
		type: String,
		require: true
	},
	state: {
		type: String,
		require: true,
		enum: [ 'RECEIVING', 'ENQUEUED', 'LOCKED', 'LOCAL', 'REMOTE', 'DELETED', 'BOUNCED' ],
		default: 'RECEIVING'
	},
	accepted: {
		type: Date,
		require: true,
		default: Date.now()
	},
	lastDeliveryAttempt: {
		type: Date,
		default: null
	},
	// Each time the queue processor attempts to deliver the message, and fails, this counter gets
	//  incremented by 1.  The number of failed previous attempts at delivery is used to calculate
	//  the time we will wait before attempting delivery again.  Each subsequent failure/reschedule
	//  cycle increases the wait time considerably.
	//
	// We will attempt to deliver a message a maximum of 6 times.  On the sixth delivery failure,
	//  the message is bounced as described below.
	//
	// After sixth failure, the message is 'bounced' (removed from the queue completely) and the 
	//  originator of the message is notified that their message could not be delivered.  At this 
	//  point, the message set in queue for a minimum of:
	//      5 minutes +
	//     60 minutes +   (1  hour)
	//    240 minutes +   (4  hours)
	//    720 minutes +   (12 hours)
	//   1440 minutes =   (24 hours)
	//   --------------
	//   2465 minutes, or just over 41 hours.
	//
	deliveryAttempts: {
		type: Number,
		require: true,
		min: 0,
		max: 5,
		default: 0
	},
	// Used by the qProcessor to fairly attempt to deliver messages while not forgetting about
	//  those who've failed delivery before.
	nextDeliveryAttempt: {
		type: Date,
		require: true,
		default: Date.now()
	},
	is_spam: {
		type: Boolean,
		require: true
	},
	spam_score: {
		type: Number,
		require: true,
		default: 0
	},
	// Define the 'mxRecords' property here in the schema, even though not all valid message documents
	//  will contain this property.  Require is set to false.
	mxRecords: {
		type: String,
		require: false
	},
	Log: {
		type: [String],
		require: true,
		default: [ 'Initial placeholder log value.' ]
	},
	attachments: {
		type: [String],
		require: false,
		default: [ ]
	}
});
module.exports = messageSchema;
