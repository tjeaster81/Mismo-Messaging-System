const mongoose = require('mongoose');

// dotenv configuration.
require('dotenv').config();

var MAX_FILE_SIZE = (process.env.SMTP_MAX_MESSAGE_SIZE * (1024*1024));

const attachmentSchema = new mongoose.Schema({

	'contentType': {
		type: String,
		required: true,
		default: 'text/plain'
	},

	'filename': {
		type: String,
		required: true,
		default: 'unspecified.file'
	},

	'content': {
		type: Buffer,
		required: [true, 'The content, in base64, of the attachment is required!'],
		validate: v => {
			if ( v.length <= 0 || v.length > MAX_FILE_SIZE ) {
				message: 'The content must be between 1 - ' + MAX_FILE_SIZE + ' bytes in length.';
				return false;
			}
			return true;
		}
	},

	'size': {
		type: Number,
		min: 0,
		max: [ MAX_FILE_SIZE, 'Exceeds file size limit of ' + process.env.SMTP_MAX_MESSAGE_SIZE + ' MB.'],
		required: true,
		default: 0
	},

	'contentDisposition': {
		type: String,
		enum: [ 'inline', 'attachment' ],
		required: true,
		default: 'attachment'
	},

	'checksum': {
		type: String,
		required: true,
		validate: {
			validator: function(v) {
				return v.length == 32 ? true : false;
			},
			message: 'An SHA256 hash is required.'
		},
		unique: true
	},

	'owner': {
		type: [String],
		required: true
	}
});

module.exports = attachmentSchema;
