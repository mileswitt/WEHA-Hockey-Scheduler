// This class is where game and player information that is supposed to be public
// is displayed to the front end

const express = require("express");
const router = express.Router();

const connectionPool = require("../config/DBConnection");

router.get("/getPlayers", async (req, res) => {
  try
  {
    const [rows] = await connectionPool.execute("SELECT * FROM Player LIMIT 100;");
    res.json(rows);
  }
  catch(error)
  {
    console.log(`ERROR: ${error.message}`);
    res.status(500).json({ERROR: error.message})
  }
});

router.get("/getLeagues", async (req, res) => {
  try
  {
    const [rows] = await connectionPool.execute("SELECT * FROM League;");
    res.json(rows);
  }
  catch(error)
  {
    console.log(`ERROR: ${error.message}`);
    res.status(500).json({ERROR: error.message})
  }
});

router.get("/getDivisions", async (req, res) => {
  try
  {
    const [rows] = await connectionPool.execute("SELECT * FROM Division;");
    res.json(rows);
  }
  catch(error)
  {
    console.log(`ERROR: ${error.message}`);
    res.status(500).json({ERROR: error.message})
  }
});


router.get("/getTeams", async (req, res) => {
  try
  {
    const [rows] = await connectionPool.execute("SELECT * FROM Team");
    res.json(rows);
  }
  catch(error)
  {
    console.log(`ERROR: ${error.message}`);
    res.status(500).json({ERROR: error.message})
  }
});

router.get("/getSeasons", async (req, res) => {
  try
  {
    const [rows] = await connectionPool.execute("SELECT * FROM Season");
    res.json(rows);
  }
  catch(error)
  {
    console.log(`ERROR: ${error.message}`);
    res.status(500).json({ERROR: error.message})
  }
});




module.exports = router; // export router to be used in index.js
