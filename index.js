const express = require('express');
const { Client } = require('pg');
const bodyParser = require('body-parser');
const db = require("./db");

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(bodyParser.json()); 

app.get("/", async (req, res) => {
    try {
        const categoriesResult = await db.query("SELECT * FROM categories");
        const expensesResult = await db.query(
            "SELECT expenses.id, expenses.amount, categories.name AS category, expenses.date FROM expenses JOIN categories ON expenses.category_id = categories.id ORDER BY date DESC"
        );

        res.render("index", { categories: categoriesResult.rows, expenses: expensesResult.rows });
    } catch (err) {
        console.error(err);
        res.send("Error fetching data");
    }
});

// Submitting Expense
app.post("/add", async (req, res) => {
    try {
        const { amount, category_id, date } = req.body;

        await db.query(
            "INSERT INTO expenses (amount, category_id, date) VALUES ($1, $2, $3)",
            [amount, category_id, date]
        );

        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.send("Error inserting data");
    }
});


app.listen(port, () => {
    console.log(`App listening at port ${port}`);
  });