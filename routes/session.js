const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { 
    scheduleSessionForm, 
    scheduleSession, 
    acceptSession, 
    declineSession,
    showRescheduleForm,
    rescheduleSession,
    cancelSession,
    getBookedDates
} = require("../controllers/sessionController");

router.get("/scheduleSession/:mentorId", isLoggedIn, wrapAsync(scheduleSessionForm));
router.post("/scheduleSession/:mentorId", isLoggedIn, wrapAsync(scheduleSession));
router.post("/acceptSession/:sessionId", isLoggedIn, wrapAsync(acceptSession));
router.post("/declineSession/:sessionId", isLoggedIn, wrapAsync(declineSession));
router.get("/rescheduleSession/:id", isLoggedIn, wrapAsync(showRescheduleForm));
router.post("/rescheduleSession/:sessionId", isLoggedIn, wrapAsync(rescheduleSession));
router.post("/cancelSession/:sessionId", isLoggedIn, wrapAsync(cancelSession));
router.get("/api/booked-dates/:mentorId", isLoggedIn, wrapAsync(getBookedDates));

module.exports = router;