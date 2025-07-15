const Mentor = require("../models/mentor");
const SessionScheduling = require("../models/session");



exports.createProfileForm = (req, res) => {
    res.render("mentor/createProfile.ejs");
};

exports.createProfile = async (req, res) => {
    let mentordata = req.body.mentor;
    let profileData = new Mentor(mentordata);
    profileData.userId = req.user._id;
    await profileData.save();
    req.flash("success", "Profile created successfully!");
    res.redirect("/showProfile");
};

exports.showProfile = async (req, res) => {
  const { mentorId } = req.params;
  let mentor;
  let sessionRequests = [];
  let upcomingSessions = [];

  if (mentorId) {
    mentor = await Mentor.findById(mentorId).populate("userId", "name email profilePicture");
    if (!mentor) {
      req.flash("error", "Mentor profile not found.");
      return res.redirect("/mentors");
    }
  } else {
    mentor = await Mentor.findOne({ userId: req.user._id }).populate("userId", "name email profilePicture");
    if (!mentor) {
      req.flash("error", "No profile found. Please create a profile first.");
      return res.redirect("/createProfile");
    }

    // 🔔 Pending session requests
    sessionRequests = await SessionScheduling.find({
      mentorId: mentor._id,
      status: "Pending",
    }).populate("menteeId", "name email");

    sessionRequests.forEach(request => {
      const dateParts = request.date.toString().split(' ').slice(0, 4);
      request.formattedDate = dateParts.join(' ');
    });

    // 📅 Upcoming confirmed sessions (with meet links)
    upcomingSessions = await SessionScheduling.find({
      mentorId: mentor._id,
      status: "Confirmed",
      date: { $gte: new Date() }, // upcoming only
    })
      .populate("menteeId", "name email")
      .sort({ date: 1 }); // soonest first
  }

  res.render("mentor/showProfile.ejs", {
    mentor,
    sessionRequests,
    upcomingSessions, // ✅ pass to view
  });
};


exports.editProfileForm = async (req, res) => {
    let id = req.params.id;
    let mentor = await Mentor.findById(id);
    res.render("mentor/editProfile.ejs", { mentor });
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body.mentor;

    // 💡 Convert skills string to array
    if (typeof updatedData.skills === "string") {
      updatedData.skills = updatedData.skills
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    }

    await Mentor.findByIdAndUpdate(id, updatedData, { new: true });
    req.flash("success", "Profile updated successfully!");
    res.redirect("/showProfile");
  } catch (err) {
    console.error("Error updating profile:", err);
    req.flash("error", "Failed to update profile.");
    res.redirect("/editProfile/" + req.params.id);
  }
};

exports.deleteProfile = async (req, res) => {
    await Mentor.findOneAndDelete({ userId: req.user._id });
    req.flash("success", "Profile Deleted successfully! Please Create New Profile");
    res.redirect("/index");
};

exports.mentorList = async (req, res) => {
    const { skill } = req.query;
    let query = {};
    if (skill) {
        query.skills = { $regex: skill, $options: "i" };
    }
    const mentors = await Mentor.find(query).populate("userId");
    res.render("mentor/mentorList.ejs", { mentors });
};

