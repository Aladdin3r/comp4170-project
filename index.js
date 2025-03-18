const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json()); 

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.listen(port, () => {
    console.log(`App listening at port ${port}`);
  });