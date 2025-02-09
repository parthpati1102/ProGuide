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

