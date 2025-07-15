const Job = require("../models/jobPost");
const Application = require("../models/acceptApplication");
const sendEmail = require("../sendEmail.js");

// Show new job form
exports.newJobForm = (req, res) => {
  try {
    return res.render("employer/createJob.ejs");
  } catch (err) {
    console.log("Render error:", err);
    res.status(500).send("View failed");
  }
};

// Create a new job
exports.createJob = async (req, res) => {
  try {
    const data = req.body.job;

    if (typeof data.requiredSkills === "string") {
      data.requiredSkills = data.requiredSkills
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0); // avoid empty values
    }
    
    const jobData = new Job(data);
    jobData.employerId = req.user._id;

    await jobData.save();
    req.flash("success", "Job created successfully!");
    return res.redirect("/myJobs");
  } catch (err) {
    console.error("Error in createJob:", err);
    req.flash("error", "Failed to create job.");
    return res.redirect("/jobs/new");
  }
};

// View employer's jobs
exports.myJobs = async (req, res) => {
  try {
    const employerId = req.user._id;
    const jobs = await Job.find({ employerId });
    return res.render("employer/myJobs.ejs", { jobs });
  } catch (err) {
    console.error("Error in myJobs:", err);
    req.flash("error", "Unable to fetch your jobs.");
    return res.redirect("/index");
  }
};

// Close a job post
exports.closeJob = async (req, res) => {
  try {
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
    return res.redirect("/myJobs");
  } catch (err) {
    console.error("Error in closeJob:", err);
    req.flash("error", "Failed to close the job.");
    return res.redirect("/myJobs");
  }
};

// Show list of available jobs (with optional skill filtering)
exports.jobList = async (req, res) => {
  try {
    const { skill } = req.query;
    let query = {};

    if (skill) {
      query.requiredSkills = { $elemMatch: { $regex: skill, $options: "i" } }
    }

    // Only show open jobs to freelancers
    if (req.user.role === "Freelancer") {
      query.status = "Open";
    }

    const jobs = await Job.find(query).populate("employerId");
    return res.render("employer/employerList.ejs", { jobs , skill});
  } catch (err) {
    console.error(" Error in jobList:", err);
    req.flash("error", "Unable to load jobs.");
    return res.redirect("/index");
  }
};

// Show apply form for a job
exports.applyJobForm = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("employerId");

    if (!job) {
      req.flash("error", "Job not found.");
      return res.redirect("/joblist");
    }

    return res.render("employer/applyJob.ejs", { job });
  } catch (err) {
    console.error("Error in applyJobForm:", err);
    req.flash("error", "Failed to load job apply form.");
    return res.redirect("/joblist");
  }
};

// Handle job application submission
exports.applyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposal, expectedBudget, availability } = req.body;
    const freelancerId = req.user._id;

    const job = await Job.findById(id).populate("employerId");

    if (!job) {
      req.flash("error", "Job not found!");
      return res.redirect("/joblist");
    }

    const existingApplication = await Application.findOne({ jobId: id, freelancerId });

    if (existingApplication) {
      req.flash("error", "You have already applied for this job!");
      return res.redirect("/index");
    }

    const application = new Application({
      jobId: id,
      freelancerId,
      employerId: job.employerId,
      proposal,
      expectedBudget,
      availability,
    });

    await application.save();

    req.flash("success", "Your application has been submitted!");
    return res.redirect("/index");
  } catch (err) {
    console.error("Error in applyJob:", err);
    req.flash("error", "Failed to submit application.");
    return res.redirect("/joblist");
  }
};


exports.acceptApplication = async (req, res) => {
  try {
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
          🎉 Congratulations! Your application for <strong>${application.jobId.title}</strong> has been 
          <span style="color: green;"><strong>accepted</strong></span> by the employer.
        </p>
        <p style="font-size: 15px;">
          You'll receive the next steps shortly via email. Please stay tuned for further instructions.
        </p>
        <p style="font-size: 14px; color: #888;">Wishing you a great start to this collaboration!<br>– Team ProGuide</p>
      </div>
    `;

    await sendEmail(freelancerEmail, subject, message);

    req.flash("success", "Application accepted. Freelancer notified via email.");
    return res.redirect("/index");

  } catch (error) {
    console.error("Error in acceptApplication:", error);
    req.flash("error", "Something went wrong while accepting the application.");
    return res.redirect("/jobApplications");
  }
};

//  Reject Job Application
exports.rejectApplication = async (req, res) => {
  try {
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
          We truly appreciate your interest and encourage you to explore other exciting opportunities on our platform.
        </p>
        <p style="font-size: 14px; color: #888;">Wishing you the best in your job search!<br>– Team ProGuide</p>
      </div>
    `;

    await sendEmail(freelancerEmail, subject, message);

    req.flash("success", "Application rejected. Freelancer notified via email.");
    return res.redirect("/index");

  } catch (error) {
    console.error("Error in rejectApplication:", error);
    req.flash("error", "Something went wrong while rejecting the application.");
    return res.redirect("/jobApplications");
  }
};