const mongoose = require("mongoose");
const jobdata = require("../models/jobdataSchema");
const express = require("express");
const router = express.Router();
const cron = require("node-cron");

cron.schedule("0 0 * * *", () => {
  console.log("Running daily job to deactivate expired jobs");
  deactivateExpiredJobs();
});
async function deactivateExpiredJobs() {
  try {
    const currentDate = new Date();
    const result = await jobdata.updateMany(
      { expirationDate: { $lt: currentDate }, isActive: true },
      { $set: { isActive: false } }
    );
    console.log(`${result.modifiedCount} expired jobs deactivated.`);
  } catch (error) {
    console.error("Error deactivating expired jobs:", error);
  }
}