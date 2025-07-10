const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { 
    scheduleSessionForm, 
    scheduleSession, 
    acceptSession, 
    declineSession 
} = require("../controllers/sessionController");

router.get("/scheduleSession/:mentorId", isLoggedIn, wrapAsync(scheduleSessionForm));
router.post("/scheduleSession/:mentorId", isLoggedIn, wrapAsync(scheduleSession));
router.post("/acceptSession/:sessionId", isLoggedIn, wrapAsync(acceptSession));
router.post("/declineSession/:sessionId", isLoggedIn, wrapAsync(declineSession));

module.exports = router;