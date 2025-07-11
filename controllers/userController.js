const User = require("../models/user");
const Mentor = require("../models/mentor");
const Job = require("../models/jobPost");
const sendEmail = require("../sendEmail.js");
const crypto = require("crypto");

exports.renderRegister = (req, res) => {
    res.render("user/signup.ejs");
};

exports.register = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    let password = req.body.password;
    let user = req.body.user;

    let newUser = new User(user);
    newUser.profilePicture = {url , filename};
    const registeredUser = await User.register(newUser , password);

    await sendEmail(
        registeredUser.email,
        "Welcome to Proguide",
        `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4CAF50;">Hi ${registeredUser.name || registeredUser.username},</h2>
            <p style="font-size: 16px;">
                Welcome to <strong>Proguide</strong> — your journey to success starts here!
            </p>
            <p style="font-size: 15px;">
                Your registration was successful. We're excited to have you on board!
            </p>
            <p style="font-size: 15px;">
                 Let's grow together.
            </p>
            <p style="font-size: 13px; color: #888;">Team Proguide</p>
            </div>
        `
    );

    req.login(registeredUser , (err) => {
        if(err){
            return next(err);
        }
        req.flash("success" , "Welcome To Proguide!");
        res.redirect("/index");
    });
};

exports.login = (req, res) => {
    let name = req.user.name;
    req.flash("success" , `Hello ${name} , Welcome Back to Proguide`);
    res.redirect("/index");
};

exports.logout = (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash("success", "You have logged out successfully!");
      res.redirect('/index');
    });
};


//Login Using OTP
exports.renderLoginOtp = (req, res) => {
    res.render("user/login-otp.ejs");
};

exports.renderVerifyOtp = (req, res) => {
    res.render("user/verify-otp.ejs", { email: req.query.email });
};

exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash("error", "Email not found");
        return res.redirect('/login-otp');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // valid for 5 minutes
    await user.save();

    await sendEmail(
        user.email,
        "Your OTP for Login",
        `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #007bff;">Login OTP</h2>
            <p style="font-size: 16px;">Your login OTP is:</p>
            <div style="font-size: 24px; font-weight: bold; color: #007bff; margin: 16px 0;">${otp}</div>
            <p style="font-size: 15px;">It expires in <strong>5 minutes</strong>.</p>
            <p style="font-size: 13px; color: #888;">Team Proguide</p>
        </div>`
    );

    req.flash("success", "OTP sent to your email.");
    res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
};

exports.verifyOtp = async (req, res, next) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
        req.flash("error", "Invalid or expired OTP.");
        return res.redirect('/login-otp');
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    req.login(user, (err) => {
        if (err) return next(err);
        req.flash("success", `Welcome back, ${user.name}!`);
        res.redirect("/index");
    });
};

//Forgot Password Functionality
exports.renderForgotPassword = (req, res) => {
    res.render("user/forgot-password.ejs");
};

exports.handleForgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash("error", "No user with that email.");
        return res.redirect("/forgot-password");
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetURL = `http://${req.headers.host}/reset-password/${token}`;
    await sendEmail(
        user.email,
        "Reset Your Password",
        `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #007bff;">Hi ${user.name || user.username},</h2>
                <p style="font-size: 16px;">
                    We received a request to reset your <strong>Proguide</strong> account password.
                </p>
                <p style="font-size: 15px;">
                    Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
                </p>
                <div style="margin: 24px 0;">
                    <a href="${resetURL}" style="background: #007bff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="font-size: 14px; color: #888;">
                    If you did not request a password reset, please ignore this email.<br>
                    For security, do not share this link with anyone.
                </p>
                <p style="font-size: 13px; color: #888;">Team Proguide</p>
            </div>
        `
    );

    req.flash("success", "Password reset link sent to your email.");
    res.redirect("/index");
};

exports.renderResetPassword = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot-password");
    }

    res.render("user/reset-password.ejs", { token: req.params.token });
};

exports.handleResetPassword = async (req, res, next) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash("error", "Token expired or invalid.");
        return res.redirect("/forgot-password");
    }

    const { password } = req.body;
    await user.setPassword(password); // passport-local-mongoose method
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.login(user, (err) => {
        if (err) return next(err);
        req.flash("success", "Password has been reset successfully!");
        res.redirect("/index");
    });
};

exports.search = async (req, res) => {
    const { query } = req.query;
    const isLoggedIn = req.isAuthenticated();


    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let jobFilter = { status: "Open" };
    let mentorFilter = {};

    let regex = null;
    let feeQuery = null;

    if (query) {
        const safeQuery = escapeRegex(query);
        regex = new RegExp(safeQuery, "i");
        feeQuery = !isNaN(Number(query)) ? Number(query) : null;

 
        jobFilter.$or = [
            { title: regex },
            { requiredSkills: regex }
        ];


        mentorFilter.$or = [];
        mentorFilter.$or.push({ skills: regex }, { goals: regex });

        if (feeQuery !== null) {
            mentorFilter.$or.push({ sessionFee: feeQuery });
        }
    }

    const jobs = await Job.find(jobFilter).populate("employerId");
    let mentors = await Mentor.find(mentorFilter).populate("userId");

    
    if (regex) {
        mentors = mentors.filter(m => {
            const nameMatch = regex.test(m.userId?.name || "");
            const expertiseMatch = regex.test(m.userId?.expertise || "");
            const skillMatch = m.skills?.some(s => regex.test(s));
            const goalMatch = m.goals && regex.test(m.goals);
            const feeMatch = feeQuery !== null && m.sessionFee === feeQuery;

            return nameMatch || expertiseMatch || skillMatch || goalMatch || feeMatch;
        });
    }


    // console.log("Final mentors sent to EJS:");
    // mentors.forEach(m => {
    //     console.log(`Name: ${m.userId?.name}, Fee: ${m.sessionFee}`);
    // });

    res.render("user/searchResults.ejs", { jobs, mentors, isLoggedIn });
};
