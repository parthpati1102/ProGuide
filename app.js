if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}

const express = require("express");
const mongoose = require("mongoose");
const methodOverRide = require("method-override");
const ejsMate = require("ejs-mate");
const path = require("path");
const http = require('http');
const socketIo = require('socket.io');
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
const Message = require('./models/message.js');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 8381;
const MONGO_URL = process.env.MONGO_URL;
const secretCode = process.env.SECRET;

server.listen(PORT, () => {
  console.log(`Server is listening to port number ${PORT}`);
});

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

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
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

// Socket.io middleware for sessions
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    connectedUsers.set(userId, socket);
    // console.log(`User connected: ${userId}`);
  }

  // Handle private messages
  socket.on('privateMessage', async ({ senderId, receiverId, content }) => {
    if (!senderId || !receiverId || !content) {
      console.error("Invalid message payload");
      return;
    }

    try {
      const message = new Message({ senderId, receiverId, content });
      await message.save(); // Store message in MongoDB

      // Emit message to receiver if they are connected
      const receiverSocket = connectedUsers.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('newMessage', {
          senderId,
          content,
          timestamp: message.timestamp, // optional
        });
      }
    } catch (err) {
      console.error("Error saving or sending message:", err);
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    for (const [uid, s] of connectedUsers.entries()) {
      if (s === socket) {
        connectedUsers.delete(uid);
        // console.log(`User disconnected: ${uid}`);
        break;
      }
    }
  });
});


// ROUTES
const userRoutes = require("./routes/user");
const mentorRoutes = require("./routes/mentor");
const jobRoutes = require("./routes/job");
const sessionRoutes = require("./routes/session");
const googleAuthRoutes = require("./routes/googleAuth");

app.use("/", userRoutes);
app.use("/", mentorRoutes);
app.use("/", jobRoutes);
app.use("/", sessionRoutes);
app.use("/auth", googleAuthRoutes);

// Error Handling
app.all("*" , (req , res , next) => {
    next(new ExpressError(404 , "Page Not Found!"));
}) 

app.use((err , req , res , next) => {
    let{statusCode = 500 , message = "Something Went Wrong!"} = err;
    res.status(statusCode).render("error.ejs" , {message});
})