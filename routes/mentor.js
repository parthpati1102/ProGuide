const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares.js");
const { mentorSchema } = require("../schema.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { 
    createProfileForm, 
    createProfile, 
    showProfile, 
    editProfileForm, 
    updateProfile, 
    deleteProfile, 
    mentorList 
} = require("../controllers/mentorController");
const ExpressError = require("../utils/ExpressError.js");

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

router.get("/createProfile", isLoggedIn, createProfileForm);
router.post("/createProfile", validateMentor, wrapAsync(createProfile));
router.get("/showProfile/:mentorId?", isLoggedIn, wrapAsync(showProfile));
router.get("/createProfile/:id/editProfile", isLoggedIn, wrapAsync(editProfileForm));
router.put("/createProfile/:id", isLoggedIn, wrapAsync(updateProfile));
router.delete("/deleteProfile", isLoggedIn, wrapAsync(deleteProfile));
router.get("/mentors", isLoggedIn, wrapAsync(mentorList));

module.exports = router;