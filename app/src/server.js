const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const app = express();

// parse requests of content-type: application/json
app.use(bodyParser.json({limit:"100mb"}));
app.use(cors());
// parse requests of content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
;

// simple route
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the isotracker api." });
});
const dotenv = require('dotenv');
dotenv.config();
require("./resources/cron/cron.routes.js")(app);


// set port, listen for requests
app.listen(process.env.NODE_DB_PORT, () => {
  console.log("Server is running on port "+process.env.NODE_DB_PORT+".");
});

