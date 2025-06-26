const mongoose = require('mongoose');

const blacklistsSchema = new mongoose.Schema({
	'added': {
		type: Date,
		required: true,
		default: Date.now()
	},
	'added_by': {
		type: String,
		required: true,
		default: '(unspecified)'
	},
	'domain': {
		type: String,
		required: true
	},
	'reason': {
		type: String,
		required: false
	}
});

module.exports = blacklistsSchema;
