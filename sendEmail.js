const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey", // this is literal string "apikey"
    pass: process.env.SENDGRID_API_KEY,
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
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email error:", error);
  }
}

module.exports = sendEmail;
