const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');

// Initialize the Express app
const app = express();
const port = 3000;

// Set up EJS as the templating engine
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true })); // For parsing URL-encoded data
app.use(bodyParser.json()); // For parsing JSON data

app.listen(port, () => {
    console.log(`App listening at port ${port}`);
  });