const express = require("express");
const router = express.Router();
const multer  = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const { userSchema } = require("../schema.js");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { renderRegister, register, login, logout, search , renderForgotPassword, handleForgotPassword, renderResetPassword, handleResetPassword , renderLoginOtp, renderVerifyOtp, sendOtp, verifyOtp} = require("../controllers/userController");
const chatController = require("../controllers/chatController");
const { isLoggedIn } = require("../middlewares.js"); // your auth middleware

const validateUser = (req, res , next) => {
    let {error} =  userSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    }else{
        next();
    }
}

router.get('/', (req, res) => res.render("user/index.ejs"));
router.get('/index', (req, res) => res.render("user/index.ejs"));
router.get("/register", renderRegister);
router.post("/register", upload.single('user[profilePicture]'), validateUser, wrapAsync(register));
router.post("/login", passport.authenticate("local", { failureRedirect : '/index', failureFlash : true }), login);
router.get('/logout', logout);
router.get('/login-otp', renderLoginOtp);
router.get('/verify-otp', renderVerifyOtp);
router.post('/send-otp', wrapAsync(sendOtp));
router.post('/verify-otp', wrapAsync(verifyOtp));
router.get("/forgot-password", renderForgotPassword);
router.post("/forgot-password", wrapAsync(handleForgotPassword));
router.get("/reset-password/:token", wrapAsync(renderResetPassword));
router.post("/reset-password/:token", wrapAsync(handleResetPassword));
router.get("/search", wrapAsync(search));
router.get("/chat/:userId", isLoggedIn, chatController.renderChatPage);

module.exports = router;