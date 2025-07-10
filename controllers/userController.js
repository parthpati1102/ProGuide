const User = require("../models/user");
const Mentor = require("../models/mentor");
const sendEmail = require("../sendEmail.js");

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

exports.search = async (req, res) => {
    const { query } = req.query;
    let jobFilter = { status: "Open" };
    let mentorFilter = {};

    if (query) {
        jobFilter.$or = [
            { title: { $regex: query, $options: "i" } },
            { requiredSkills: { $regex: query, $options: "i" } }
        ];
        mentorFilter.$or = [
            { name: { $regex: query, $options: "i" } },
            { expertise: { $regex: query, $options: "i" } },
            { skills: { $regex: query, $options: "i" } }
        ];
    }

    const jobs = await require("../models/jobPost").find(jobFilter).populate("employerId");
    const mentors = await Mentor.find(mentorFilter).populate("userId");
    const isLoggedIn = req.isAuthenticated();

    res.render("user/searchResults.ejs", { jobs, mentors, isLoggedIn });
};