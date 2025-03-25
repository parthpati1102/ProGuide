const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    title: String,
    description: String,
    budget: Number,
    deadline: Date,
    requiredSkills: [String],
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["Open", "Closed"], default: "Open" }
});

module.exports = mongoose.model("Job", jobSchema);