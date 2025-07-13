const mongoose = require("mongoose");
const User = require("./user.js");
const { number } = require("joi");

const mentorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
  },
  bio: {
    type: String, 
    maxlength: 500,
  },
  skills: {
    type: [String], 
  },
  goals: {
    type: String, 
  },
  availability: {
    type: String, 
    default: "Available",
  },
  education: {
    type: String, 
  },
  experience: {
    type: String, 
  },

  sessionFee: {
    type : Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  googleTokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number,
  },
});

const Mentor= mongoose.model("Mentor", mentorSchema);
module.exports = Mentor;