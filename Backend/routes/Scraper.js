const { spawn } = require('child_process'); // this is the process that runs the websraping scripts
const express = require("express");
const router = express.Router();

// This will allow the program to always find the relative path of python.exe to run the webscraper and also find the main.py script to run
const path = require("path");

// __dirname gets the absolute file path of the current directory
const PythonPath = path.join(__dirname, process.env.PYTHON_VENV_PATH);
const WebScraperPath = path.join(__dirname, process.env.WEBSCRAPER_PATH);

var scraperStatus = {running: false, success: false, message: ""} // object to track webscraper status during run of python script

router.post("/runWebScrape", async(req, res) => {
    try
    {
        // if web scraper is not running, start child process to start web scraper
        if(!scraperStatus.running)
        {
            scraperStatus.running = true;
            scraperStatus.message = "Starting Web Scraper";

            console.log(`Starting web scraper...`);
            console.log(`Python: ${PythonPath}`);
            console.log(`Script: ${WebScraperPath}`);

            res.json({scraperStatus}); // send response of server starting to client

            const pythonProcess = spawn(
            PythonPath,  // path to webscraper python in VENV
            ["-u", WebScraperPath] // -u disables Python output buffering so stdout is flushed in real time
            );

            // Spawn error (e.g. python.exe not found)
            pythonProcess.on("error", (err) => {
                console.log(`SPAWN ERROR: ${err.message}`);
                scraperStatus.running = false;
                scraperStatus.success = false;
                scraperStatus.message = `Spawn Error: ${err.message}`;
            });

            // Standard Output:
            pythonProcess.stdout.on("data", (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log(`WEB SCRAPING OUTPUT: ${output}`);
                    scraperStatus.message = output;
                }
            });

            // Standard ERROR Output:
            let stderrBuffer = "";
            pythonProcess.stderr.on("data", (data) => {
                stderrBuffer += data;
            });

            // close process after webscraping has ended
            pythonProcess.on("close", (code) => {
                console.log(`Web scraper exited with code ${code}`);
                scraperStatus.running = false;
                if (code === 0) {
                    scraperStatus.success = true;
                    scraperStatus.message = "Web Scraper Finished Successfully";
                } else {
                    scraperStatus.success = false;
                    scraperStatus.message = `Web Scraping Failed (exit code ${code}): ${stderrBuffer}`;
                    console.log(`STDERR: ${stderrBuffer}`);
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

// Idea is to poll this enpoint every 
router.get("/webScrapeStatus", (req, res) =>{
   res.json({scraperStatus}) // Show current web scraper status using web scraper info object
});

module.exports = router;