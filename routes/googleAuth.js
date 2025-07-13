const express = require("express");
const router = express.Router();
const oAuth2Client = require("../utils/googleAuth");
const Mentor = require("../models/mentor");

router.get("/google", async (req, res) => {

  // console.log("Session User:", req.user);
  if (!req.user || !req.user._id) {
    req.flash("error", "You must be logged in as a mentor.");
    return res.redirect("/index");
  }
  
  const mentor = await Mentor.findOne({ userId: req.user._id });

  if (!mentor) {
    req.flash("error", "Mentor profile not found.");
    return res.redirect("/showProfile");
  }

  // Store mentorId temporarily
  req.session.mentorId = mentor._id;

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",              // ensures refresh_token
    prompt: "consent",                   // forces refresh_token even if previously granted
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  res.redirect(authUrl);
});

// Google OAuth Callback
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const mentorId = req.session.mentorId;

    if (!mentorId) {
      req.flash("error", "Mentor session expired. Please try again.");
      return res.redirect("/index");
    }

    if (!tokens.refresh_token) {
      req.flash("error", "Google did not return a refresh token. Please click Connect again.");
      return res.redirect("/showProfile");
    }
    
    // console.log("Google Tokens received:", tokens); 

    // Save tokens in mentor document
    await Mentor.findByIdAndUpdate(mentorId, { googleTokens: tokens });

    // Fetch and log updated mentor document
    const updatedMentor = await Mentor.findById(mentorId);
    // console.log("Updated Mentor Document:", updatedMentor);

    req.flash("success", "✅ Google Calendar connected successfully!");
    res.redirect("/showProfile");
  } catch (err) {
    console.error("Google OAuth Error:", err.message);
    req.flash("error", "Something went wrong during Google Calendar connection.");
    res.redirect("/showProfile");
  }
});

module.exports = router;