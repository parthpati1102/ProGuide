const nodemailer = require("nodemailer");
require('dotenv').config();

// console.log(process.env.EMAIL_PASS);
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // App-specific password
  },
});

async function sendEmail(to, subject, message) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: message,
    });
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

module.exports = sendEmail;