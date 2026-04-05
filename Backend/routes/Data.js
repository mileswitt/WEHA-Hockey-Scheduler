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
  catch(Error)
  {
    console.log(`ERROR: ${Error}`);
    res.status(500).json({ERROR: "Failed to Get Player Information"})
  }
});

module.exports = router; // export router to be used in index.js
