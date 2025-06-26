const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
	'ts': {
		type: Date,
		required: true,
		default: Date.now()
	},
	'application': {
		type: String,
		required: true
	},
	'message': {
		type: String,
		required: true
	},
	'host': {
		type: String,
		required: true,
		default: '(unknown)'
	},
	'pid': {
		type: Number,
		required: false
	}
});

module.exports = logSchema;
