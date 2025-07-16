require("dotenv").config();
const Mentor = require("../models/mentor");
const moment = require("moment-timezone");
const SessionScheduling = require("../models/session");
const sendEmail = require("../sendEmail.js");
const createCalendarEvent = require("../utils/calendarEvent");
const { google } = require("googleapis");

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
  try {
    // ✅ Update session status
    const session = await SessionScheduling.findByIdAndUpdate(
      req.params.sessionId,
      { status: "Confirmed" },
      { new: true }
    ).populate("menteeId");

    if (!session) {
      req.flash("error", "Session not found.");
      return res.redirect("/showProfile");
    }

    // ✅ Get full mentor with tokens and user info
    const mentor = await Mentor.findById(session.mentorId).populate("userId");
    session.mentorId = mentor; // Attach full mentor object

    // ✅ Parse time string like "07:00 PM"
    const timeStr = session.time.trim();
    const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

    if (!timeParts) {
      throw new Error("Invalid time format. Expected format like '07:00 PM'");
    }

    let [_, hourStr, minuteStr, meridian] = timeParts;
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);

    if (meridian.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (meridian.toUpperCase() === "AM" && hours === 12) hours = 0;

    // ✅ Build start datetime in IST using moment-timezone
    const startDateTime = moment.tz(session.date, "YYYY-MM-DD", "Asia/Kolkata")
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0)
      .toDate();

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    let meetLink = "";

    // ✅ Create Google Calendar event if tokens exist
    if (
      mentor.googleTokens &&
      mentor.googleTokens.access_token &&
      mentor.googleTokens.refresh_token
    ) {
      const event = await createCalendarEvent(
        mentor.googleTokens,
        {
          topic: session.topic || "Mentorship Session",
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        },
        session.menteeId
      );
      meetLink = event.hangoutLink || "";

      // ✅ Save meet link to DB
      session.meetLink = meetLink;
      session.googleCalendarEventId = event.id;
      await session.save();
    }

    // ✅ Send confirmation email to mentee
    const menteeEmail = session.menteeId.email;
    const subject = "Session Request Accepted";
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hi ${session.menteeId.name},</p>
          <p style="font-size: 15px;">
          Great news! Your session request with <strong>Mentor ${mentor.userId.name}</strong> has been <span style="color: green;"><strong>accepted</strong></span>.
          </p>
          <p style="font-size: 15px;">
          Your session is scheduled for <strong>${session.date.toDateString()} at ${session.time}</strong>.
          </p>
          ${
            meetLink
              ? `
          <p style="font-size: 15px;">
          Join the session using this Google Meet link:<br>
          <a href="${meetLink}" style="color: #007bff; font-weight: bold;">${meetLink}</a>
          </p>
          `
              : `
          <p style="font-size: 15px;">
          The mentor will share the Google Meet link before the session.
          </p>
          `
          }
          <p style="font-size: 14px; color: #888;">Wishing you a valuable and productive session!<br>– Team ProGuide</p>
      </div>
    `;

    await sendEmail(menteeEmail, subject, message);

    req.flash("success", "Session accepted. Google Meet link sent to mentee.");
    res.redirect("/showProfile");

  } catch (error) {
    console.error("❌ Error accepting session:", error);
    req.flash("error", error.message || "Something went wrong.");
    res.redirect("/showProfile");
  }
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

exports.showRescheduleForm = async (req, res) => {
  const session = await SessionScheduling.findById(req.params.id);
  if (!session) {
    req.flash("error", "Session not found.");
    return res.redirect("/showProfile");
  }
  res.render("mentor/rescheduleSession.ejs", { session });
};


async function updateGoogleCalendarEvent(tokens, eventId, newStart, newEnd) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  return await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all", // this will notify all attendees including mentee
    resource: {
      start: { dateTime: newStart },
      end: { dateTime: newEnd },
    },
  });
}
exports.rescheduleSession = async (req, res) => {
  try {
    const session = await SessionScheduling.findById(req.params.sessionId)
      .populate("menteeId");

    if (!session) {
      req.flash("error", "Session not found.");
      return res.redirect("/showProfile");
    }

    const mentor = await Mentor.findById(session.mentorId).populate("userId");

    // Parse new date and time
    const newDate = req.body.newDate;
    const newTime = req.body.newTime;

    const timeParts = newTime.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!timeParts) throw new Error("Invalid time format.");

    let [_, hourStr, minuteStr, meridian] = timeParts;
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    if (meridian.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (meridian.toUpperCase() === "AM" && hours === 12) hours = 0;

    const startDateTime = moment.tz(newDate, "YYYY-MM-DD", "Asia/Kolkata")
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0)
      .toDate();

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

    // Update session details
    session.date = new Date(newDate);
    session.time = newTime;
    await session.save();

    // Update Google Calendar event
    if (
      session.googleCalendarEventId &&
      mentor.googleTokens &&
      mentor.googleTokens.access_token
    ) {
      await updateGoogleCalendarEvent(
        mentor.googleTokens,
        session.googleCalendarEventId,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );
    }

    const menteeEmail = session.menteeId.email;
    const subject = "Session Rescheduled Notification";
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hi ${session.menteeId.name},</p>
          <p style="font-size: 15px;">
          Your session with <strong>Mentor ${mentor.userId.name}</strong> has been <span style="color: #d9822b;"><strong>rescheduled</strong></span>.
          </p>
          <p style="font-size: 15px;">
          Your new session is scheduled for <strong>${newDate} at ${newTime}</strong>.
          </p>
          ${
            session.meetLink
              ? `
          <p style="font-size: 15px;">
          Join the session using this Google Meet link:<br>
          <a href="${session.meetLink}" style="color: #007bff; font-weight: bold;">${session.meetLink}</a>
          </p>
          `
              : `
          <p style="font-size: 15px;">
          The mentor will share the updated Google Meet link before the session.
          </p>
          `
          }
          <p style="font-size: 14px; color: #888;">We hope you have a great session!<br>– Team ProGuide</p>
      </div>
    `;

    await sendEmail(menteeEmail, subject, message);

    req.flash("success", "Session rescheduled successfully.");
    res.redirect("/showProfile");

  } catch (error) {
    console.error("❌ Error rescheduling session:", error);
    req.flash("error", "Something went wrong while rescheduling.");
    res.redirect("/showProfile");
  }
};


async function deleteGoogleCalendarEvent(tokens, eventId) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all", // Notify participants
  });
}


exports.cancelSession = async (req, res) => {
  try {
    const session = await SessionScheduling.findById(req.params.sessionId).populate("menteeId");
    if (!session) {
      req.flash("error", "Session not found.");
      return res.redirect("/showProfile");
    }

    const mentor = await Mentor.findById(session.mentorId).populate("userId");

    // Delete Google Calendar event if it exists
    if (
      session.googleCalendarEventId &&
      mentor.googleTokens &&
      mentor.googleTokens.access_token
    ) {
      await deleteGoogleCalendarEvent(mentor.googleTokens, session.googleCalendarEventId);
    }

    // ✅ Send styled cancellation email to mentee
    const menteeEmail = session.menteeId.email;
    const subject = "Session Cancelled";
    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hi ${session.menteeId.name},</p>
          <p style="font-size: 15px;">
            We regret to inform you that your session with <strong>Mentor ${mentor.userId.name}</strong> scheduled for <strong>${session.date.toDateString()} at ${session.time}</strong> has been <span style="color: red;"><strong>cancelled</strong></span>.
          </p>
          <p style="font-size: 15px;">We apologize for any inconvenience caused.</p>
          <p style="font-size: 14px; color: #888;">Thank you for understanding.<br>– Team ProGuide</p>
      </div>
    `;

    if (menteeEmail) {
      await sendEmail(menteeEmail, subject, message);
    }

    // Delete session from DB
    await session.deleteOne();

    req.flash("success", "Session cancelled successfully.");
    res.redirect("/showProfile");

  } catch (error) {
    console.error("Error cancelling session:", error);
    req.flash("error", "Something went wrong while cancelling.");
    res.redirect("/showProfile");
  }
};

// Get Booked Dates API (used by mentee calendar)
exports.getBookedDates = async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    const sessions = await SessionScheduling.find({ mentorId });

    const bookedDates = sessions.map(session =>
      session.date.toISOString().split("T")[0]
    );

    return res.json({ bookedDates });
  } catch (err) {
    console.error("Error fetching booked dates:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
