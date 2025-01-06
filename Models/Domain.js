const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
        domain: {
                type: String,
                require: true
        },
        added: {
                type: Date,
                default: Date.now(),
        },
        enabled: {
                type: Boolean,
                default: false
        },
        expires: {
                type: Date,
                default: null
        }
});

module.exports = domainSchema;
