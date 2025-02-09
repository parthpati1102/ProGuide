const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["Mentor", "Mentee", "Freelancer", "Employer"],
  },
  profilePicture: {
    url : String,
    filename : String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

module.exports = User;
