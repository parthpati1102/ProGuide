const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares.js");
const { jobSchema } = require("../schema.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { 
    newJobForm, 
    createJob, 
    myJobs, 
    closeJob, 
    jobList, 
    applyJobForm, 
    applyJob, 
    acceptApplication, 
    rejectApplication 
} = require("../controllers/jobController");
const ExpressError = require("../utils/ExpressError.js");

const validateJob = (req, res , next) => {
    let {error} =  jobSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    }else{
        next();
    }
}

router.get("/jobs/new", isLoggedIn, wrapAsync(newJobForm));
router.post("/jobs",  isLoggedIn, wrapAsync(createJob));
router.get("/myJobs", isLoggedIn, wrapAsync(myJobs));
router.post("/closeJob/:jobId", isLoggedIn, wrapAsync(closeJob));
router.get("/joblist", isLoggedIn, wrapAsync(jobList));
router.get("/jobs/:id/apply", isLoggedIn, wrapAsync(applyJobForm));
router.post("/jobs/:id/apply", isLoggedIn, wrapAsync(applyJob));
router.post("/acceptApplication/:applicationId", isLoggedIn, wrapAsync(acceptApplication));
router.post("/rejectApplication/:applicationId", isLoggedIn, wrapAsync(rejectApplication));

module.exports = router;