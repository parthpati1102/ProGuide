// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.sendgrid.net",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "apikey", // this is literal string "apikey"
//     pass: process.env.SENDGRID_API_KEY,
//   },
// });

// async function sendEmail(to, subject, message) {
//   try {
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to,
//       subject,
//       html: message,
//     });
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.error("Email error:", error);
//   }
// }

// module.exports = sendEmail;

const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, message) {
  try {
    await sgMail.send({
      to,
      from: {
        email: process.env.EMAIL_USER,
        name: "ProGuide",
      },
      subject,
      html: message,
    });

    console.log("Email sent successfully via SendGrid API");
  } catch (error) {
    console.error(
      "SendGrid API error:",
      error.response?.body || error.message
    );
  }
}

module.exports = sendEmail;
