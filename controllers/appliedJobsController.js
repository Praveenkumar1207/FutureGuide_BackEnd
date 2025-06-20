const express = require('express');
const appliedJobs = require('../models/appliedjobs');
const UserProfile = require('../models/userProfileSchema'); // Ensure this path is correct
const JobData = require('../models/jobdataSchema');

const isworking = async (req, res) => {
    console.log('isworking endpoint was called!'); // Debug log
    return res.status(200).json({ 
        message: "API is working",
        timestamp: new Date().toISOString(),
        route: "/api/appliedjobs/isworking"
    });
}

const addappliedJob = async (req, res) => {
    try {
        const { jobId, profileId } = req.body;
        // console.log("Received request to add applied job:", { jobId, profileId }); // Debug log
        // Validate IDs
        if (!jobId || !profileId) {
            return res.status(400).json({ message: "Job ID and Profile ID are required" });
        }
        if (!jobId.match(/^[0-9a-fA-F]{24}$/) || !profileId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid Job ID or Profile ID format" });
        }

        // Fetch job and profile data
        const job = await JobData.findById(jobId);
        const profile = await UserProfile.findById(profileId);

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const appliedJob = new appliedJobs({
            jobId,
            jobName: job.jobTitle,
            companyName: job.companyName,
            profileId,
            applicationDate: new Date()
        });
        console.log("Creating applied job:", appliedJob); // Debug log
        const savedAppliedJob = await appliedJob.save();
        res.status(201).json(savedAppliedJob);
    } catch (error) {
        console.error("Error adding applied job:", error);
        res.status(500).json(error);
    }
};

const getAllAppliedJobs = async (req, res) => {
    try {
        const profileId = req.params.profileId;
        
        if (!profileId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid Profile ID format" });
        }
        // console.log("Fetching applied jobs for profile ID:", profileId); // Debug log
        // console.log("user profile data", await UserProfile.findById(profileId)); // Debug log

        // Fix: Use appliedJobs instead of AppliedJob
        const appliedJobsList = await appliedJobs.find({ profileId })
            .populate('jobId', 'jobTitle companyName')
            .select('jobId applicationDate');
        // Format the response
        
        const formattedJobs = appliedJobsList.map(job => ({
            jobId: job.jobId._id,
            jobTitle: job.jobId.jobTitle,
            companyName: job.jobId.companyName,
            applicationDate: job.applicationDate
        }));
        // console.log("Formatted applied jobs:", formattedJobs); // Debug log
        console.log("Number of applied jobs found:", formattedJobs.length); // Debug log
        if(formattedJobs.length === 0) {
            return res.status(404).json({ message: "No applied jobs found for this profile" });
        }
        res.status(200).json(formattedJobs);

    } catch (error) {
        console.error("Error fetching applied jobs:", error);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = {
    addappliedJob,
    getAllAppliedJobs,
    isworking
}
