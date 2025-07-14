const { google } = require("googleapis");
const oAuth2Client = require("./googleAuth");

async function createCalendarEvent(mentorTokens, sessionDetails, mentee) {
  try {
    // console.log("▶ Creating calendar event...");
    // console.log("Mentor Tokens:", mentorTokens);
    // console.log("Session Details:", sessionDetails);
    // console.log("Mentee:", mentee);

    // Explicitly set tokens to ensure all required fields are included
    oAuth2Client.setCredentials({
      access_token: mentorTokens.access_token,
      refresh_token: mentorTokens.refresh_token,
      expiry_date: mentorTokens.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const startTime = new Date(sessionDetails.startTime);
    const endTime = new Date(sessionDetails.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Invalid start or end time");
    }

    const event = {
      summary: `Mentorship Session with ${mentee.name}`,
      description: `Topic: ${sessionDetails.topic || "General Mentoring"}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: [{ email: mentee.email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },  // ⏰ Email 1 hour before
          { method: "popup", minutes: 10 },  // 🔔 Popup 10 minutes before
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: "meet-" + Date.now(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    // console.log("Event Created:", response.data.htmlLink);
    return response.data;

  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

module.exports = createCalendarEvent;

