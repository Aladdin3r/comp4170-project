const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const db = require("./db");

const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json()); 

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get("/", async (req, res) => {
    try {
        const categoriesResult = await db.query("SELECT * FROM categories");
        const expensesResult = await db.query(
            "SELECT expenses.id, expenses.amount, categories.name AS category, expenses.date FROM expenses JOIN categories ON expenses.category_id = categories.id ORDER BY date DESC"
        );

        res.render("index.js", { categories: categoriesResult.rows, expenses: expensesResult.rows });
    } catch (err) {
        console.error(err);
        res.send("Error fetching data");
    }
});

app.listen(port, () => {
    console.log(`App listening at port ${port}`);
  });