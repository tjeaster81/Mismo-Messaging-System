//
// Models/Admin.js
// TJ Easter <sixserpents@protonmail.com>
// 01/12/2025
//
// This model is not used by the SMTP Engine or qProcessor;
//   the MismoAdmin control panel uses the 'admins' collection for
//   authentication.
//
//

const mongoose = require("mongoose");

// dotenv configuration.
require('dotenv').config();

const adminSchema = new mongoose.Schema({
	// username:
	// The case-sensitive username that the MismoAdmin control panel will use.
	//  *This value must be unique* as it serves as essentially the primary key
	//  of the collection.
	username: {
		type: String,
		required: true,
		unique: true,
		minLength: 4,
		maxLength: 256
	},

	// password:
	// A 4-element array of Strings.  password[0] is the current user's
	//  password.  password[1] is the *most*-recently used previous password;
	//  password[2] is the password used previous to that one, etc.
	password: [String],

	//
	//
	realName: {
		type: String,
		required: true,
		minLength: 4,
		maxLength: 512
	},

	//
	//
	email: {
		type: String,
		required: true,
		minLength: 4,
		maxLength: 1024
	},



	// domains:
	// An array of CASE-INSENSITIVE domain names (stored in lowercase text) that this 
	//  user is allowed to manage.  A domain name may appear in multiple Admin's domain list.
	domains: {
		type: [String],
		required: true,
		default: [ 'localdomain.' ],
		validate: v => {
			return true;
		}
	},










	//
	//
	added: {
		type: Date,
		required: true,
		default: Date.now(),
		validate: v => {
			if ( v > Date.now() ) {
				// The user was added in the future?  Suspicious.
				message: 'Cannot add a user with a timestamp in the future.';
				return false;
			}
			return true;
		}
	},

	//
	//
	enabled: {
		type: Boolean,
		required: true,
		default: true
	},

	//
	//
	expires: {
		type: Date,
		required: false,
		default: null,
		validate: v => {
			if ( v <= Date.now() ) {
				message: 'Can only set expiration dates in the future (dates greater than Date.now()).';
				return false;
			}
			return true;
		}
	}



});



module.exports = adminSchema;
