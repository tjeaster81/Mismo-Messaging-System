const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
	state: {
		type: String,
		require: true,
		enum: [ 'RECEIVING', 'ENQUEUED', 'LOCKED', 'DELIVERED', 'DELETED' ],
		default: 'RECEIVING'
	},
	accepted: {
		type: Date,
		default: Date.now()
	},
	lastDeliveryAttempt: {
		type: Date,
		default: null
	}

});
module.exports = messageSchema;
