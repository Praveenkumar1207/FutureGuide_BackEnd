const jobdata = require("../models/jobdataSchema")
const express = require("express");

const addjobData = async(req,res)=>{
    try{
        const job = new jobdata({
            jobTitle: req.body.jobTitle,
            companyName: req.body.companyName,
            jobDescription: req.body.jobDescription,
            location: req.body.location,
            salaryRange: req.body.salaryRange,
            jobType: req.body.jobType,
            requirements: req.body.requirements,
            expirationDate: new Date(req.body.expirationDate),
            isActive: true
        });
        const savedJob = await job.save();
        res.status(201).json(savedJob);
    }
    catch(error){
        console.error("Error adding job data:", error);
        res.status(500).json(error);
    }
}

const updatejobData = async(req,res)=>{
    try{
        const jobId = req.params.id;
        const updatedJob = await jobdata.findByIdAndUpdate(
            jobId,
            {
                jobTitle: req.body.jobTitle,
                companyName: req.body.companyName,
                jobDescription: req.body.jobDescription,
                location: req.body.location,
                salaryRange: req.body.salaryRange,
                jobType: req.body.jobType,
                requirements: req.body.requirements,
                expirationDate: new Date(req.body.expirationDate),
                isActive: req.body.isActive
            },
            { new: true }
        );
        if (!updatedJob) {
            return res.status(404).json({ message: "Job not found" });
        }
        res.status(200).json(updatedJob);
    } catch (error) {
        console.error("Error updating job data:", error);
        res.status(500).json(error);
    }
}

const deletejobData = async(req,res)=>{
    try{
        const jobId = req.params.id;
        const deletedJob = await jobdata.findByIdAndDelete(jobId);
        if (!deletedJob) {
            return res.status(404).json({ message: "Job not found" });
        }
        res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
        console.error("Error deleting job data:", error);
        res.status(500).json(error);
    }
}

const getjobData = async(req,res)=>{
     
    try{
        const jobs = await jobdata.find({ isActive: true });
        res.status(200).json(jobs);
    } catch (error) {
        console.error("Error fetching active job data:", error);
        res.status(500).json(error);
    }
  
}

const getjobDataById = async(req,res)=>{
    try{
        const jobId = req.params.id;
        const job = await jobdata.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        res.status(200).json(job);
    } catch (error) {
        console.error("Error fetching job data by ID:", error);
        res.status(500).json(error);
    }
} 
module.exports = {
    addjobData,
    updatejobData,
    deletejobData,
    getjobData,
    getjobDataById
};

