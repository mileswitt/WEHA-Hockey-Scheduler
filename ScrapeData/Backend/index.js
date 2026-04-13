const dataRouting = require("./routes/Data");
const webScraperRouting = require("./routes/Scraper");

const express = require("express");
const app = express();
app.use(express.json());

app.use(express.static('public'));

const PORT = process.env.PORT || 5000;


// app.get("/", (req, res) => {
//   res.json({ message: "Server Now Running"});
//   // res.redirect("/getPlayers"); // For testing
// });

app.use("/api", dataRouting);

app.use("/api", webScraperRouting);

app.listen(PORT, () => {
  console.log(`Server Listening on Port: http://127.0.0.1:${PORT}/`);
});
