const crypto = require('crypto');

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
	// A globally-unique string of the 'user@domain.tld' format.  
	//
	// This 'username' property is what ties this document to the corresponding 'mailboxes'
	//  document (both have a property 'username'; documents from both 'mailboxes' and 'profiles'
	//  can be located using the 'username' property); there is currently no reference/link
	//  between these two collections - just remember that for internal stuff, the 'username' value
	//  is the primary means of looking up both the mailbox and the profile.
	//
	// Note: The 'uuid' value is what we'll use in any user-visible URLs when referencing this user.
	//  If a property from the 'mailboxes' document is required in our code, but all we've been
	//  provided by the user is a UUID, we'll need to:
	//  (a) Fetch the 'profiles' document based on the UUID provided by the user
	//  (b) Obtain the 'username' value from the aforementioned 'profiles' document
	//  (c) Fetch the 'mailboxes' document based on the 'profiles.username' value from the
	//      previous step.
	//
	// If the username provided doesn't (at least) contain the @ symbol, we'll reject the document.
	'username': {
		type: String,
		required: true,
		validate: v => {
			if ( v.indexOf('@') == -1 ) {
				message: 'Invalid username specified.';
				return false;
			}

			[ user, domain ] = v.trim().split('@');

			if ( user.length < 3 ) {
				message: 'Invalid username specified.';
				return false;
			}
			if ( domain.indexOf('.') == -1 ) {
				message: 'Invalid username specified.';
				return false;
			}

			return true;
		},
		unique: true,
		minLength: [8, 'Username too short.'],
		maxLength: [1026, 'Username too long.']
	},

	// A globally-unique v4 UUID string used as a sort of "primary key" for referencing
	//  this user.  For instance, when viewing the user's profile page, the page will
	//  include a user-uploaded image of themselves.  The backend code handling the URI:
	//  '/profile/picture' will expect a UUID provided in the query-string so that the
	//  URL ends up looking something like this:
	//
	// /profile/picture?id=078c7613-9e3a-451b-b33f-64b41336f33c
	//  -OR-
	// /profile/pgpKey?id=baaebe67-52b4-4f34-b44f-bee0c3e27ed3
	// 
	// NOTE:  Since this property will be used more often to locate documents than the
	//  'username' field (i.e., we don't want to be passing usernames with the @ symbol
	//  in publicly-visible URLs), we should create an INDEX on 'profiles.uuid'.
	//
	'uuid': {
		type: String,
		require: true,
		default: crypto.randomUUID(),
		unique: true
	},
	
	//
	// Profile picture; a buffer containing up to 5 MB of image/jpeg data.
	//
	//
	// Note:  It will be up to the profile management code to convert (gif, webp, png)
	//  images to the required 'image/jpeg' MIME type stored here.  For instance, if
	//  the user wishes to upload a new profile picture (that's in GIF format, for instance),
	//  it will be up to that section of code to convert GIF -> JPEG before storing the
	//  binary data in the 'profile_picture' property.
	//
	'profile_picture': {
		type: Buffer,
		required: true,
		validate: v => {
			// If the value provided for 'profile_picture' is null, we'll permit that and
			//  return true immediately.  We're only interested in checking the size (min
			//  and max) if the value provided is non-null.
			//
			// If the user does not have a profile picture, this value will default to null.
			if ( v == null ) {
				return true;
			}

			if ( v.length <= 0 ) {
				message: 'Invalid/empty profile picture data.';
				return false;
			}
			if ( v.length > (5 * 1024 * 1024) ) {
				message: 'Profile picture image data too large ( > 5 MB).';
				return false;
			}
			return true;
		},
		default: null
	},



	//
	// A boolean flag indicating whether or not to use two-factor authentication (2FA).
	//  If set to true, we'll need to send a random 6-digit integer to the SMS address
	//  associated with this user, and accept that additional input when authenticating
	//  the user's username/password.
	//
	// If the boolean is set to false (default), we'll authenticate the user based on
	//  the username and password alone.
	//
	'2fa': {
		type: Boolean,
		required: true,
		default: false
	},



	//
	// The user's "backup" email address.  Useful for password recovery scenarios.
	//  The user will receive an email at this address containing a link to verify
	//  their backup email address.  The URL will reference the 'email_verification'
	//  string in it's query-string; thus, clicking the link in their inbox will
	//  cause our code to find the user based on the 'email_verification' string and
	//  set the 'email_verified' property to the current timestamp.
	//
	// We can assert that the user's backup email address has -not- been verified if
	//  the 'email_verified' property is null (which it defaults to).
	//
	'email': {
		type: String,
		required: true,
		validate: v => {
			if ( v.indexOf('@') == -1 ) {
				message: 'Invalid email address specified.';
				return false;
			}
			return true;
		}
	},
	'email_verification': {
		type: String,
		required: true,
		validate: v => {
			if ( v.length != 64 ) {
				message: 'Invalid verification string specified.';
				return false;
			}
			return true;
		},
		default: crypto.randomBytes(64).toString('hex')
	},
	'email_verified': {
		type: Date,
		required: true,
		default: null
	},



	//
	// The user's SMS address (for receiving text messages).  During the sign-up process, the user
	//  will be sent a random 6-digit integer via SMS for verification.  If the user provides their
	//  valid SMS address and they receive the text, the user can then submit the 6-digit integer
	//  sent via SMS to validate their address.  Once the user has provided the correct 6 digits,
	//  we set the 'sms_verified' property to the current timestamp (i.e., Date.now()).
	//
	// We can assert that the user's SMS address has been verified if the 'sms_verified' property
	//  contains a Date value as opposed to null (which it defaults to).
	//
	// Note: Having a correct/verified SMS address is useful if you want to enable 2FA for accessing
	//  the webmail system.  The login process, upon seeing that this user has 2FA enabled, can send
	//  an SMS message that the user can provide -in addition to- the username/password combo.
	//
	'sms': {
		type: String,
		required: true,
		validate: v => {
			if ( v.indexOf('@') == -1 ) {
				message: 'Invalid SMS address specified.';
				return false;
			}
			return true;
		},
		minLength: [16, 'SMS address too short.'],
		maxLength: [128, 'SMS address too long.'],
	},
	'sms_verification': {
		type: Number,
		required: true,
		min: [100000, 'SMS verification code cannot be less than 100,000.'],
		max: [999999, 'SMS verification code cannot be greater than 999,999.'],
		default: crypto.randomInt(100000,999999)
	},
	'sms_verified': {
		type: Date,
		required: true,
		default: null
	},

	

	// Store the user's location in a GeoJSON Point
	//
	// At least for now, we'll only ask the user for their location data -at sign-up-,
	//  useful for helping create connections between users based on geographic proximity.
	//  We may start asking for the user's location data -all the time.-  Having a Point
	//  to reference every time a user sends a message (potentially storing the sender's
	//  location in the 'messages' documents) would give us multiple points in which we
	//  can associate this user with other users based on geographic proximity.
	//
	// For instance, if we notice that two (or more) users are sending emails from
	//  Bob's Coffee Shop, even at different times of the day, we could potentially
	//  associate these users based on their preference for Bob's Coffee Shop over any
	//  other coffee shops.
	//
	// NOTE:  Getting user's to agree to providing their exact GPS location, especially
	//  on a repeated basis, is a big ask.  User's should have an option to opt-out of
	//  any location tracking functionality.
	//
	// FIXME:
	// I'm not sure that this property is defined properly.  I know we want a property
	//  called 'location', of type 'Point', containing a 2-element array named 'coordinates'
	//  representing the longitude/latitude of the user.
	//
	// The rest of the validation code is somewhat redundant, but is here to sanitize any
	//  user-provided data.
	//
	// FIXME: (2)
	// It would be nice if, during sign-up, allowing the user to type in their location (i.e.,
	//  St. Louis, Missouri, USA) and we could somehow "look up" (via some external API?) the
	//  GPS coordinates and store them here.
	//
	'location': {
		type: Point,
		coordinates: [ ],
		validate: v => {
			[ longitude, latitude ] = v;
			longitude.trim(); latitude.trim();

			// Ensure that our longitude/latitude values are sane:
			if ( longitude < -180 || longitude > 180 ) {
				message: 'Invalid longitude specified: {VALUE}.';
				return false;
			}
			if ( latitude < -180 || latitude > 180 ) {
				message: 'Invalid latitude specified: {VALUE}.';
				return false;
			}

			return true;
		},
		required: true,
		default: [ 0, 0 ]
	},



	// A short auto-biography of the user.  Free-form text, but still might
	//  be useful to mine keywords with the intent of "learning" about this
	//  user to better match with other users of similar interests, background,
	//  and/or geographical location.
	//
	// Note:  This is a -required- property, and the maxLength
	'bio': {
		type: String,
		required: true,
		minLength: [1, 'Bio property cannot be null/empty.'],
		maxLength: [(2*(1024*1024)), 'Bio property too long; max size 2 MB.'],
		validate: v => {
			if ( v == null ) {
				message: 'Bio property cannot be null/empty.';
				return false;
			}
			if ( v.length <= 0 ) {
				message: 'Bio property cannot be null/empty.';
				return false;
			}
			if ( v.length > (2 * (1024*1024)) ) {
				message: 'Bio property too long; max size 2 MB.';
				return false;
			}
			return true;
		},
		default: 'This user has not finished setting up his/her profile.'
	},



	// An array of strings representing the interests/hobbies of this user.  This
	//  array is primarily how we'll make "connections" between users.  If both Alice
	//  and Bob including 'camping' in their interests, they might be a potential
	//  connection (especially if within close geographic proximity).
	//
	// For now, the user will be presented with a textarea field in which to manually
	//  type in a comma-separated list of interests.  During the sign-up phase (and
	//  when the user changes his interests in the profile editor), it will be up to
	//  that code to split(',') the string into an array as this schema expects an array.
	//
	// The schema below enforces that -at least- one interest must be specified.
	'interests': {
		type: [String],
		required: true,
		validate: v => {
			if ( v.length < 1 ) {
				message: 'At least one interest must be specified.';
				return false;
			}
			if ( v.length > 1024 ) {
				message: 'No more than 1,024 interests may be specified.';
				return false;
			}
			return true;
		}
	},



	// Date of Birth / birthday
	// Here we enforce the 13 year old age limit; IOW, if your birthday shows
	//  you to be < 13 years old, you cannot sign up for this service.
	'dob': {
		type: Date,
		required: true,
		validate: v => {
			currentDate = Date.now();
			thirteenYearsAgo = new Date(currentDate);
			thirteenYearsAgo.setFullYear(currentDate.getFullYear() - 13);

			if ( v > thirteenYearsAgo ) {
				message: 'Users of this service must be at least 13 years of age.';
				return false;
			}

			return true;
		}
	},


	
	// Gender:
	'gender': {
		type: String,
		required: true,
		enum: ['CIS Male', 'CIS Female', 'Trans Male', 'Trans Female', 'Other', 'Not Specified'],
		default: 'Not Specified'
	},
	// Pronouns:
	'pronouns': {
		type: String,
		required: true,
		validate: v => {
			if ( v.indexOf('/') == -1 ) {
				message: 'Invalid pronouns specified.';
				return false;
			}
			return true;
		},
		enum: ['He/Him', 'She/Her', 'They/Them', 'Other', 'Not Specified'],
		default: 'Not Specified'
	},



	'homepage': {
		type: String,
		required: false,
		validate: v => {
			if ( ! v.startsWith('http://') && ! v.startsWith('https://') ) {
				message: 'Homepage URL must be of type HTTP/HTTPS.';
				return false;
			}
			if ( v.length <= 8 ) {
				message: 'Homepage URL too short to be valid.';
				return false;
			}
			return true;
		},
		default: null
	},
	'facebook': {
		type: String,
		required: false,
		minLength: [6, 'Facebook username must be at least 6 characters in length.'],
		default: null
	},
	'twitter': {
		type: String,
		required: false,
		minLength: [6, 'X/Twitter username must be at least 6 characters in length.'],
		default: null
	},
	'mastodon': {
		type: String,
		required: false,
		minLength: [6, 'Mastodon username must be at least 6 characters in length.'],
		validate: v => {
			if ( ! v.startsWith('@') ) {
				message: 'Invalid Mastodon username provided.';
				return false;
			}
			return true;
		}
	},
	'github': {
		type: String,
		required: false,
		minLength: [6, 'Github username must be at least 6 characters in length.'],
		default: null
	}


});

module.exports = profileSchema;
