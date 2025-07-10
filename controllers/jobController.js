const Job = require("../models/jobPost");
const Application = require("../models/acceptApplication");
const sendEmail = require("../sendEmail.js");

exports.newJobForm = (req, res) => {
    res.render("employer/createJob.ejs");
};

exports.createJob = async (req, res) => {
    let data = req.body.job;
    let jobData = new Job(data);
    jobData.employerId = req.user._id;
    await jobData.save();
    req.flash("success", "Job created successfully!");
    res.redirect("/index");
};

exports.myJobs = async (req, res) => {
    const employerId = req.user._id;
    const jobs = await Job.find({ employerId });
    res.render("employer/myJobs.ejs", { jobs });
};

exports.closeJob = async (req, res) => {
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
};

exports.jobList = async (req, res) => {
    const { skill } = req.query;
    let query = {};
    if (skill) {
        query.requiredSkills = { $regex: skill, $options: "i" };
    }
    if (req.user.role === "Freelancer") {
        query.status = "Open";
    }
    const jobs = await Job.find(query).populate("employerId");
    res.render("employer/employerList.ejs", { jobs });
};

exports.applyJobForm = async (req, res) => {
    const job = await Job.findById(req.params.id).populate("employerId");
    if (!job) {
        req.flash("error", "Job not found.");
        return res.redirect("/jobs");
    }
    res.render("employer/applyJob.ejs", { job });
};

exports.applyJob = async (req, res) => {
    const { id } = req.params;
    const { proposal, expectedBudget, availability } = req.body;
    const freelancerId = req.user._id;
    const job = await Job.findById(id).populate("employerId");
    if (!job) {
        req.flash("error", "Job not found!");
        return res.redirect("/jobs");
    }
    const existingApplication = await Application.findOne({ jobId: id, freelancerId });
    if (existingApplication) {
        req.flash("error", "You have already applied for this job!");
        return res.redirect(`/index`);
    }
    const application = new Application({
        jobId: id,
        freelancerId,
        employerId: job.employerId,
        proposal,
        expectedBudget,
        availability
    });
    await application.save();
    req.flash("success", "Your application has been submitted!");
    res.redirect(`/index`);
};

exports.acceptApplication = async (req, res) => {
    const application = await Application.findByIdAndUpdate(
        req.params.applicationId,
        { status: "Accepted" },
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
};

exports.rejectApplication = async (req, res) => {
    const application = await Application.findByIdAndUpdate(
        req.params.applicationId,
        { status: "Rejected" },
        { new: true }
    ).populate("jobId freelancerId");
    if (!application) {
        req.flash("error", "Application not found.");
        return res.redirect("/jobApplications");
    }
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
};