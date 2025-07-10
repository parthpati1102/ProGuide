const Mentor = require("../models/mentor");
const SessionScheduling = require("../models/session");
const sendEmail = require("../sendEmail.js");

exports.scheduleSessionForm = async (req, res) => {
    const mentor = await Mentor.findById(req.params.mentorId).populate("userId");
    if (!mentor) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/mentors");
    }
    res.render("mentor/scheduleSession.ejs", { mentor });
};

exports.scheduleSession = async (req, res) => {
    const {date, time , ampm} = req.body;
    const mentorId = req.params.mentorId;
    const formattedTime = `${time} ${ampm}`;
    const session = new SessionScheduling({
        mentorId,
        menteeId: req.user._id,
        date,
        time : formattedTime,
    });
    await session.save();
    req.flash("success", "Session request sent successfully!");
    res.redirect("/index");
};

exports.acceptSession = async (req, res) => {
    const session = await SessionScheduling.findByIdAndUpdate(
        req.params.sessionId,
        { status: "Confirmed" },
        { new: true }
      ).populate({
        path: "mentorId",
        populate: {
          path: "userId",
          select: "name email",
        },
      }).populate("menteeId");
    const menteeEmail = session.menteeId.email;
    const subject = "Session Request Accepted";
    const message = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hi ${session.menteeId.name},</p>
        <p style="font-size: 15px;">
        Great news! Your session request with <strong>Mentor ${session.mentorId.userId.name}</strong> has been <span style="color: green;"><strong>accepted</strong></span>.
        </p>
        <p style="font-size: 15px;">
        Please keep an eye on your inbox — the mentor will share the Google Meet link before the session.
        </p>
        <p style="font-size: 14px; color: #888;">Wishing you a valuable and productive session!<br>– Team Proguide</p>
    </div>
    `;
    await sendEmail(menteeEmail, subject, message);
    req.flash("success", "Session accepted and mentee notified.");
    res.redirect("/showProfile");
};

exports.declineSession = async (req, res) => {
    const session = await SessionScheduling.findByIdAndUpdate(
        req.params.sessionId,
        { status: "Cancelled" },
        { new: true }
      ).populate({
        path: "mentorId",
        populate: {
          path: "userId",
          select: "name email",
        },
      }).populate("menteeId");
    if (!session) {
        req.flash("error", "Session not found.");
        return res.redirect("back");
    }
    const message = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <p style="font-size: 16px;">Hi ${session.menteeId.name},</p>
        <p style="font-size: 15px;">
        We’re sorry to inform you that your session request with <strong>Mentor ${session.mentorId.userId.name}</strong> has been declined.
        </p>
        <p style="font-size: 15px;">
        Feel free to explore other available time slots or mentors for your learning journey.
        </p>
        <p style="font-size: 14px; color: #888;">Thank you for your understanding.<br>Team Proguide</p>
    </div>
    `;
    await sendEmail(session.menteeId.email, "Session Request Declined", message);
    req.flash("success", "Session declined, and the mentee has been notified.");
    res.redirect("/showProfile");
};