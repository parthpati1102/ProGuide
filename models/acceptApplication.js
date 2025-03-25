const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    proposal: { type: String, required: true }, 
    expectedBudget: { type: Number, required: true }, 
    availability: { 
        type: String, 
        enum: ["Immediate", "Within a Week", "Flexible"], 
        required: true 
    }, 
    status: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" } 
});

module.exports = mongoose.model("Application", applicationSchema);
