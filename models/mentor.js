const mongoose = require("mongoose");
const User = require("./user.js");

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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Mentor= mongoose.model("Mentor", mentorSchema);
module.exports = Mentor;