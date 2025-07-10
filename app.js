if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const express = require("express");
const mongoose = require("mongoose");
const methodOverRide = require("method-override");
const ejsMate = require("ejs-mate");
const path = require("path");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer  = require('multer');
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const { userSchema, mentorSchema, jobSchema } = require("./schema.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/user");
const Mentor = require("./models/mentor");
const Application = require("./models/acceptApplication");


const app = express();
const PORT = 8381;
const MONGO_URL = process.env.MONGO_URL;
const secretCode = process.env.SECRET;

app.listen(PORT , () => {
    console.log(`Server is listening to port number ${PORT}`);
})

const store = MongoStore.create({
    mongoUrl : MONGO_URL,
    crypto : { secret : secretCode },
    touchAfter : 24 * 60 * 60,
});
store.on("error" ,() => {
    console.log("ERROR in MONGO SESSSION STORE" , error)
})

const sessionOptions = {
    store,
    secret : secretCode,
    resave: false,
    saveUninitialized: true,
    cookie : {
        expire : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    }
}

app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname , "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverRide("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

main()
.then( () => { console.log("Connection Successfull"); })
.catch((err) => { console.log(err); });
async function main() { await mongoose.connect(MONGO_URL); }

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req , res , next) => {
    res.locals.success  = req.flash("success");
    res.locals.error  = req.flash("error");
    res.locals.currUser = req.user || null;
    res.locals.page = req.path === '/index' ? 'index' : req.path.substring(1); 
    next();
})

app.use(async (req, res, next) => {
    if (req.user) {
      const mentorProfile = await Mentor.findOne({ userId: req.user._id });
      res.locals.mentorProfile = mentorProfile;
      res.locals.showCreateProfile = !mentorProfile;
    } else {
      res.locals.mentorProfile = null;
      res.locals.showCreateProfile = false;
    }
    next();
});

app.use(async (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "Employer") {
      try {
          const jobApplications = await Application.find({ employerId: req.user._id , status: "Pending" })
              .populate("freelancerId jobId");
          res.locals.jobApplications = jobApplications;
      } catch (err) {
          console.error("Error fetching job applications:", err);
          res.locals.jobApplications = [];
      }
  } else {
      res.locals.jobApplications = [];
  }
  next();
});

// ROUTES
const userRoutes = require("./routes/user");
const mentorRoutes = require("./routes/mentor");
const jobRoutes = require("./routes/job");
const sessionRoutes = require("./routes/session");

app.use("/", userRoutes);
app.use("/", mentorRoutes);
app.use("/", jobRoutes);
app.use("/", sessionRoutes);

// Error Handling
app.all("*" , (req , res , next) => {
    next(new ExpressError(404 , "Page Not Found!"));
}) 

app.use((err , req , res , next) => {
    console.error("Error:", err);
    let{statusCode = 500 , message = "Something Went Wrong!"} = err;
    res.status(statusCode).render("error.ejs" , {message});
})