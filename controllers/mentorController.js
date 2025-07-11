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
        sessionRequests = await SessionScheduling.find({ mentorId: mentor._id, status: "Pending" })
            .populate("menteeId", "name email");
        sessionRequests.forEach(request => {
            const dateParts = request.date.toString().split(' ').slice(0, 4);
            request.formattedDate = dateParts.join(' ');
        });
    }
    res.render("mentor/showProfile.ejs", { mentor, sessionRequests });
};

exports.editProfileForm = async (req, res) => {
    let id = req.params.id;
    let mentor = await Mentor.findById(id);
    res.render("mentor/editProfile.ejs", { mentor });
};

exports.updateProfile = async (req, res) => {
    let id = req.params.id;
    await Mentor.findByIdAndUpdate(id, { ...req.body.mentor });
    req.flash("success", "Profile Updated successfully!");
    res.redirect("/showProfile");
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