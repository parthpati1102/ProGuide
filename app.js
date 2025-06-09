if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}


const express = require("express");
const mongoose = require("mongoose");
const methodOverRide = require("method-override");
const ejs = require("ejs");
const ejsMate = require("ejs-mate");

const  sendEmail = require("./sendEmail.js");
const SessionScheduling = require("./models/session");
const User = require("./models/user");
const Mentor = require("./models/mentor");
const Job = require("./models/jobPost");
const Application = require("./models/acceptApplication");

const { isLoggedIn } = require("./middlewares.js");

const path = require("path");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const multer  = require('multer')
const {storage} = require("./cloudConfig.js");
const upload = multer({storage });

const {userSchema , mentorSchema , jobSchema} = require("./schema.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

const app = express();
const PORT = 8381;
const MONGO_URL = `mongodb+srv://parthpatidar1102:m6XfWAznzvok99PO@cluster0.boh7w.mongodb.net/FreelancingAndMentorConnect?retryWrites=true&w=majority&appName=Cluster0`
const secretCode = process.env.SECRET;


app.listen(PORT , () => {
    console.log(`Server is listening to port number ${PORT}`);
})


const store = MongoStore.create({
    mongoUrl : MONGO_URL,
    crypto : {
        secret : secretCode
    },
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
.then( () => {
    console.log("Connection Successfull");
})
.catch((err) => {
    console.log(err);
})
async function main() {
    await mongoose.connect(MONGO_URL);
}


const validateUser = (req, res , next) => {
    let {error} =  userSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    }else{
        next();
    }
}

const validateMentor = (req, res , next) => {
    if (typeof req.body.mentor.skills === "string") {
        req.body.mentor.skills = req.body.mentor.skills.split(",").map((skill) => skill.trim());
    }

    let {error} =  mentorSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    }else{
        next();
    }
}

const validateJob = (req, res , next) => {
    let {error} =  jobSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    }else{
        next();
    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req , res , next) => {
    // console.log('Current user:', req.user); 
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
      res.locals.showCreateProfile = !mentorProfile; // Add to locals for all views
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
          res.locals.jobApplications = jobApplications; // Store globally
      } catch (err) {
          console.error("Error fetching job applications:", err);
          res.locals.jobApplications = [];
      }
  } else {
      res.locals.jobApplications = [];
  }
  next();
});

app.get('/' , (req , res) => {
    res.render("user/index.ejs");
})

app.get("/index" , (req , res) => {
    res.render("user/index.ejs");
})


// User Login And Register Process
app.get("/register" , (req , res) => {
    res.render("user/signup.ejs");
})

app.post("/register" , upload.single('user[profilePicture]') , validateUser , wrapAsync (async(req , res , next) => {
   try{
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
    })
   }catch(err){
       req.flash("error" , err.message);
       res.redirect("/register");
   }
 }));

app.post("/login" ,passport.authenticate("local" ,{
    failureRedirect : '/index' , failureFlash : true}) ,
    async (req , res) => {
    let name = req.user.name;
    req.flash("success" , `Hello ${name} , Welcome Back to Proguide`);
    res.redirect("/index");
})

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash("success", "You have logged out successfully!");
      res.redirect('/index');
    });
});

//If User is not LoggedIn they can explore all available mentors and jobs
app.get("/search", async (req, res) => {
    try {
        const { query } = req.query;
        let jobFilter = { status: "Open" }; // Show only open jobs
        let mentorFilter = {}; // No status filter for mentors

        // Search logic (case-insensitive)
        if (query) {
            jobFilter.$or = [
                { title: { $regex: query, $options: "i" } },
                { requiredSkills: { $regex: query, $options: "i" } }
            ];
            mentorFilter.$or = [
                { name: { $regex: query, $options: "i" } },
                { expertise: { $regex: query, $options: "i" } },
                { skills: { $regex: query, $options: "i" } } // Search by skills
            ];
        }

        // Fetch jobs and mentors
        const jobs = await Job.find(jobFilter).populate("employerId");
        const mentors = await Mentor.find(mentorFilter).populate("userId");

        // Check if user is logged in
        const isLoggedIn = req.isAuthenticated();

        res.render("user/searchResults.ejs", { jobs, mentors, isLoggedIn });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving search results.");
    }
});



//Starting with the freeLancing Routes
app.get("/jobs/new", wrapAsync(async (req, res, next) => {
    try {
        res.render("employer/createJob.ejs");
    } catch (err) {
        next(err);  // Pass the error to Express error handler
    }
}));

//Employer can create the job
app.post("/jobs", wrapAsync(async (req, res) => {
  try {
      //console.log(req.body);  Debugging: Check form data

      let data = req.body.job;

      let jobData = new Job(data);
      jobData.employerId = req.user._id;

      await jobData.save();

      req.flash("success", "Job created successfully!");
      res.redirect("/index");
  } catch (err) {
      console.error("Job creation error:", err);
      req.flash("error", "Failed to create job. Please try again.");
      res.redirect("/jobs/new");  // Redirect to job creation form
  }
}));

//Employer can see the list of jobs
app.get("/myJobs", isLoggedIn, wrapAsync(async (req, res) => {
    const employerId = req.user._id;

    // Fetch all job posts created by the employers
    const jobs = await Job.find({ employerId });

    res.render("employer/myJobs.ejs", { jobs });
}));

//Employer can Close the job
app.post("/closeJob/:jobId", isLoggedIn, wrapAsync(async (req, res) => {
    const job = await Job.findByIdAndUpdate(
        req.params.jobId,
        { status: "Closed" },
        { new: true }
    );

    if (!job) {
        req.flash("error", "Job not found.");
        return res.redirect("/myJobs");
    }

    req.flash("success", "Job status updated to 'Closed'.");
    res.redirect("/myJobs");
}));

//Freelancer can Search for the Jobs
app.get("/joblist", isLoggedIn, wrapAsync(async (req, res) => {
    try {
        const { skill } = req.query;
        let query = {};

        // Search by required skills (case-insensitive)
        if (skill) {
            query.requiredSkills = { $regex: skill, $options: "i" };
        }

        // If the user is a freelancer, show only open jobs
        if (req.user.role === "Freelancer") {
            query.status = "Open";
        }

        const jobs = await Job.find(query).populate("employerId");
        res.render("employer/employerList.ejs", { jobs });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving jobs.");
    }
}));

//FreeLancer can apply for the job
app.get("/jobs/:id/apply", isLoggedIn, wrapAsync(async (req, res) => {
  const job = await Job.findById(req.params.id).populate("employerId");
  if (!job) {
      req.flash("error", "Job not found.");
      return res.redirect("/jobs");
  }
  res.render("employer/applyJob.ejs", { job });
}));


//Freelancer can apply for the job
app.post("/jobs/:id/apply", isLoggedIn, async (req, res) => {
  try {
      const { id } = req.params;
      const { proposal, expectedBudget, availability } = req.body; // Added availability
      const freelancerId = req.user._id;

      // Check if the job exists
      const job = await Job.findById(id).populate("employerId");
      if (!job) {
          req.flash("error", "Job not found!");
          return res.redirect("/jobs");
      }

      // Check if the freelancer has already applied
      const existingApplication = await Application.findOne({ jobId: id, freelancerId });
      if (existingApplication) {
          req.flash("error", "You have already applied for this job!");
          return res.redirect(`/index`);
      }

      // Create a new application with availability
      const application = new Application({
          jobId: id,
          freelancerId,
          employerId: job.employerId,  // Store the employer reference
          proposal,
          expectedBudget,
          availability // Include availability
      });

      await application.save();

      req.flash("success", "Your application has been submitted!");
      res.redirect(`/index`);
  } catch (err) {
      console.error("Error applying for job:", err);
      req.flash("error", "Something went wrong. Please try again.");
      res.redirect(`/index`);
  }
});


//Route that can accept the application
app.post("/acceptApplication/:applicationId", isLoggedIn, wrapAsync(async (req, res) => {
  try {
      const application = await Application.findByIdAndUpdate(
          req.params.applicationId,
          { status: "Accepted" }, // Update the status
          { new: true }
      ).populate("jobId freelancerId");

      if (!application) {
          req.flash("error", "Application not found.");
          return res.redirect("/jobApplications");
      }

        const freelancerEmail = application.freelancerId.email;
        const subject = "Job Application Accepted";

        const message = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hi ${application.freelancerId.name},</p>
            <p style="font-size: 15px;">
            🎉 Congratulations! Your application for <strong>${application.jobId.title}</strong> has been <span style="color: green;"><strong>accepted</strong></span> by the employer.
            </p>
            <p style="font-size: 15px;">
            You'll receive the next steps shortly via email. Please stay tuned for more instructions.
            </p>
            <p style="font-size: 14px; color: #888;">Wishing you a great start to this collaboration!<br>Team Proguide</p>
        </div>
        `;

        await sendEmail(freelancerEmail, subject, message);


      req.flash("success", "Application accepted. Freelancer notified via email.");
      res.redirect("/index");
  } catch (err) {
      console.error(err);
      req.flash("error", "Error accepting application.");
      res.redirect("/index");
  }
}));

//Route that can reject the application
app.post("/rejectApplication/:applicationId", isLoggedIn, wrapAsync(async (req, res) => {
    try {
        const application = await Application.findByIdAndUpdate(
            req.params.applicationId,
            { status: "Rejected" }, // Update the status
            { new: true }
        ).populate("jobId freelancerId");

        if (!application) {
            req.flash("error", "Application not found.");
            return res.redirect("/jobApplications");
        }

        // Send email to the freelancer
        const freelancerEmail = application.freelancerId.email;
        const subject = "Job Application Update";

        const message = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <p style="font-size: 16px;">Hi ${application.freelancerId.name},</p>
            <p style="font-size: 15px;">
            Thank you for applying for <strong>${application.jobId.title}</strong>.
            </p>
            <p style="font-size: 15px;">
            We regret to inform you that the employer has chosen to move forward with another candidate.
            </p>
            <p style="font-size: 15px;">
            We truly value your interest and encourage you to explore other exciting opportunities on our platform that match your skills.
            </p>
            <p style="font-size: 14px; color: #888;">Wishing you all the best in your job search!<br>Team Proguide</p>
        </div>
        `;

        await sendEmail(freelancerEmail, subject, message);


        req.flash("success", "Application rejected. Freelancer notified via email.");
        res.redirect("/index");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error rejecting application.");
        res.redirect("/index");
    }
}));


//User Profile Process Started So Mentor Can easily perform CRUD operations
app.get("/createProfile" ,isLoggedIn, (req , res) => {
    res.render("mentor/createProfile.ejs");
})

app.post("/createProfile", validateMentor, wrapAsync(async (req, res) => {
    try {
        let mentordata = req.body.mentor;
        let profileData = new Mentor(mentordata);
        profileData.userId = req.user._id;

        await profileData.save();
        req.flash("success", "Profile created successfully!");
        res.redirect("/showProfile");
    } catch (err) {
        req.flash("error", "Failed to create profile. Please try again.");
        res.redirect("/createProfile");
    }
}));

//Show Route for Showing the mentor Profile
app.get("/showProfile/:mentorId?", isLoggedIn, wrapAsync(async (req, res) => {
    const { mentorId } = req.params;
    let mentor;
    let sessionRequests = [];

    // If mentorId exists, mentee is viewing a mentor's profile
    if (mentorId) {
        mentor = await Mentor.findById(mentorId).populate("userId", "name email profilePicture");
        if (!mentor) {
            req.flash("error", "Mentor profile not found.");
            return res.redirect("/mentors");
        }
    } else {
        // Mentor viewing their own profile
        mentor = await Mentor.findOne({ userId: req.user._id }).populate("userId", "name email profilePicture");
        if (!mentor) {
            req.flash("error", "No profile found. Please create a profile first.");
            return res.redirect("/createProfile");
        }

        // Fetch pending session requests for the logged-in mentor
        // console.log("Mentor ID:", mentor._id);
        sessionRequests = await SessionScheduling.find({ mentorId: mentor._id, status: "Pending" })
            .populate("menteeId", "name email");
        // console.log(sessionRequests);

      sessionRequests.forEach(request => {
          const dateParts = request.date.toString().split(' ').slice(0, 4);
          request.formattedDate = dateParts.join(' ');
      });
    }
   
    res.render("mentor/showProfile.ejs", { mentor, sessionRequests});
}));


//Edit Profile of Mentor
app.get("/createProfile/:id/editProfile" ,isLoggedIn, wrapAsync(async(req , res) => {
     let id = req.params.id;

     let mentor = await Mentor.findById(id);
     
     res.render("mentor/editProfile.ejs" , {mentor});
}))

app.put("/createProfile/:id" ,isLoggedIn, wrapAsync(async(req , res) => {
      let id = req.params.id;
      let mentorData = await Mentor.findByIdAndUpdate(id , {...req.body.mentor});
      
      req.flash("success", "Profile Updated successfully!");
      res.redirect("/showProfile");

}))

//Mentor can delete the Profile
app.delete("/deleteProfile",isLoggedIn , wrapAsync(async (req, res) => {
    await Mentor.findOneAndDelete({ userId: req.user._id });

    req.flash("success", "Profile Deleted successfully! Please Create New Profile");
    res.redirect("/index");
}));

//Search Route
app.get("/mentors",isLoggedIn , wrapAsync( async (req, res) => {


    try {
      const { skill } = req.query;
      let query = {};
  
      // Case-insensitive search in skills array
      if (skill) {
        query.skills = { $regex: skill, $options: "i" };
      }
  
      const mentors = await Mentor.find(query).populate("userId");
      res.render("mentor/mentorList.ejs", { mentors });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error retrieving mentors.");
    }
}));

//Here is the Session Route So mentees can easily book sessions with the mentors
app.get("/scheduleSession/:mentorId", isLoggedIn, wrapAsync(async (req, res) => {
    const mentor = await Mentor.findById(req.params.mentorId).populate("userId");
    if (!mentor) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/mentors");
    }
    res.render("mentor/scheduleSession.ejs", { mentor });
}));

//Route for booking the session and collecting information
app.post("/scheduleSession/:mentorId", isLoggedIn,wrapAsync( async (req, res) => {
    const {date, time , ampm} = req.body;
    const mentorId = req.params.mentorId;
    

    try {
      
      // const formattedDate = dateTime.toString().split(' ').slice(0, 4).join(' ');
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
    } catch (err) {
      console.error(err);
      req.flash("error", "Error scheduling session.");
      res.redirect(`/scheduleSession/${mentorId}`);
    }
}));

//Using this route we can able to send the mail to the mentee

//This is the route for accepting the session
app.post("/acceptSession/:sessionId", isLoggedIn,wrapAsync( async (req, res) => {
  try {
    const session = await SessionScheduling.findByIdAndUpdate(
        req.params.sessionId,
        { status: "Confirmed" },
        { new: true }
      ).populate({
        path: "mentorId",
        populate: {
          path: "userId", // Populate user reference in the Mentor schema
          select: "name email", // Fetch only name and email from the User schema
        },
      }).populate("menteeId");
    
    // const googleMeetLink = "https://meet.google.com/qwd-itog-jom";
    // <p>Google Meet Link: <a href="${googleMeetLink}">${googleMeetLink}</a></p>

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
  } catch (err) {
    console.error(err);
    req.flash("error", "Error accepting session.");
    res.redirect("/showProfile");
  }
}));

//This is the route for declining the session
app.post("/declineSession/:sessionId", isLoggedIn,wrapAsync( async (req, res) => {
    try {
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
    } catch (err) {
      console.error(err);
      req.flash("error", "Error declining session.");
      res.redirect("/showProfile");
    }
  }));
  
// Error Handing Middlwwares
app.all("*" , (req , res , next) => {
    next(new ExpressError(404 , "Page Not Found!"));
}) 

 app.use((err , req , res , next) => {
    let{statusCode = 500 , message = "Something Went Wrong!"} = err;
    res.status(statusCode).render("error.ejs" , {message});
 })


