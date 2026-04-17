
require("dotenv").config();

const dataRouting = require("./routes/Data");
const webScraperRouting = require("./routes/Scraper");
const adminLogin = require("./routes/Admin");
const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({ message: "Server Now Running"});
});

app.use("/api", dataRouting);
app.use("/api", webScraperRouting);
app.use("/api", adminLogin);

app.listen(PORT, () => {
  console.log(`Server Listening on Port: http://127.0.0.1:${PORT}/`);
});

