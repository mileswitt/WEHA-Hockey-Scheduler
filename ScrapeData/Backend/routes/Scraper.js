const { spawn } = require('child_process'); // this is the process that runs the websraping scripts
const express = require("express");
const router = express.Router();

// This will allow the program to always find the relative path of python.exe to run the webscraper and also find the main.py script to run
const path = require("path");

// __dirname gets the absolute file path of the current directory
const PythonPath = path.join(__dirname, "../../.venv/Scripts/python.exe");
const WebScraperPath = path.join(__dirname, "../../main.py");

var scraperStatus = {running: false, success: false, message: ""} // object to track webscraper status during run of python script

router.post("/runWebScrape", async(req, res) => {
    try
    {
        // if web scraper is not running, start child process to start web scraper
        if(!scraperStatus.running)
        {
            scraperStatus.running = true;
            scraperStatus.message = "Starting Web Scraper";

            res.json({scraperStatus}); // send response of server starting to client

            const pythonProcess = spawn(
            PythonPath,  // path to webscraper python in VENV
            ["-u", WebScraperPath] // -u disables Python output buffering so print() is visible immediately
            );

            // Standard Output:
            // print webscraping output here:
            pythonProcess.stdout.on("data", (data) => {
                console.log(`WEB SCRAPING OUTPUT: \n${data}`);
            });

            // Standard ERROR Output:
            pythonProcess.stderr.on("data", (data) => {
                const errorMsg = `WEB SCRAPING ERROR: ${data}`;
                console.error(errorMsg);
                scraperStatus.message = errorMsg;
            });

            // close process after webscraping has ended
            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    scraperStatus.success = true; // set success flag to true
                    scraperStatus.message = "Web Scraper Finished Successfully"; // set success message
                    scraperStatus.running = false; // set running back to false since the web scraper is done with retrieving data
                } else {
                    scraperStatus.success = false // set failure flag
                    scraperStatus.message = "Web Scraping Failed"; // set failure message
                    scraperStatus.running = false; // since running web scraper failed, running has stoped
                }
            });
        }
        // else, it is running send message back to user giving current status of webscraper
        else
        {
            scraperStatus.message = "Web Scraper Is Currently Running..."; // Send message to let user know when web scraper is runnning
            res.json({scraperStatus}); // return current status of webscraping operation
        }
    }
    catch(ERROR)
    {
        console.log(`ERROR, WEB SCRAPING FAILED: ${ERROR}`);
    }
});

// Idea is to poll this endpoint every 5 seconds to ensure data is up to date
router.get("/webScrapeStatus", (req, res) =>{
   res.json({scraperStatus}) // Show current web scraper status using web scraper info object
});

module.exports = router;
