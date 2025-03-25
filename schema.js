const Joi = require('joi');

module.exports.userSchema = Joi.object({
        user: Joi.object({
        name: Joi.string().pattern(/^[a-zA-Z ]+$/).required(),
        username: Joi.string().required(),
        email: Joi.string().required(),
        profilePicture: Joi.string().allow("",null),
        role: Joi.string().required(),
       }).required(),
       password: Joi.string().required(),
});

module.exports.mentorSchema = Joi.object({
        mentor : Joi.object({
        bio: Joi.string().max(500).allow("", null), 
        skills: Joi.array().items(Joi.string()).allow(null), 
        goals: Joi.string().allow("", null), 
        availability: Joi.string().valid("Available", "Busy").default("Available"),
        education: Joi.string().allow("", null),
        experience: Joi.string().allow("", null), 
        }).required(),
});


module.exports.jobSchema = Joi.object({
    job: Joi.object({
        title: Joi.string().max(500).required(),  
        description: Joi.string().allow("", null),  
        budget: Joi.number().min(0).required(),  
        deadline: Joi.alternatives([
                Joi.date().iso().greater("now"),  // ISO format
                Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        return helpers.error("any.invalid");  // Reject invalid dates
                    }
                    if (date <= new Date()) {
                        return helpers.error("date.greater", { limit: "now" });  // Ensure future date
                    }
                    return value; // Return valid date
                }, "Custom Date Validation")
        ]).required(), 
        requiredSkills: Joi.array().items(Joi.string()).min(1).required(), 
        status: Joi.string().valid("Open", "In Progress", "Completed").default("Open") 
    }).required()
});

