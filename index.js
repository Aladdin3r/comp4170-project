const express = require("express");
const { Client } = require("pg");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", async (req, res) => {
	try {
		const categoriesResult = await db.query("SELECT * FROM categories");
		const expensesResult = await db.query(
			`
            SELECT expenses.id, expenses.amount, categories.name AS category, 
            expenses.date FROM expenses 
            JOIN categories ON expenses.category_id = categories.id 
            ORDER BY date DESC
            `
		);

		res.render("index", {
			categories: categoriesResult.rows,
			expenses: expensesResult.rows,
		});
	} catch (err) {
		console.error(err);
		res.send("Error fetching data");
	}
});

// Submitting an expense
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

// Recent transactions list
app.get("/transactions/recent", async (req, res) => {
	try {
		const result = await db.query(`
            SELECT e.id, 
                   CASE 
                        WHEN c.name = 'Income' THEN e.amount  -- Positive for income
                        ELSE -e.amount  -- Negative for expenses
                   END AS amount, 
                   c.name AS category, 
                   TO_CHAR(e.date, 'YYYY-MM-DD') AS date
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE e.date >= NOW() - INTERVAL '7 days'
            ORDER BY e.date DESC
            LIMIT 10;
        `);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send("Error fetching recent transactions");
	}
});

// This month's transactions
app.get("/transactions/month", async (req, res) => {
	try {
		const result = await db.query(`
            SELECT e.id, 
                   CASE 
                        WHEN c.name = 'Income' THEN e.amount  
                        ELSE -e.amount  
                   END AS amount, 
                   c.name AS category, 
                   TO_CHAR(e.date, 'YYYY-MM-DD') AS date
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE EXTRACT(MONTH FROM e.date) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ORDER BY e.date DESC;
        `);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send("Error fetching this month's transactions");
	}
});

// custom month
app.get("/transactions/custom", async (req, res) => {
	const { year, month } = req.query;
	if (!year || !month)
		return res.status(400).send("Year and Month are required");

	try {
		const result = await db.query(
			`
            SELECT e.id, 
                   CASE 
                        WHEN c.name = 'Income' THEN e.amount  
                        ELSE -e.amount  
                   END AS amount, 
                   c.name AS category, 
                   TO_CHAR(e.date, 'YYYY-MM-DD') AS date
            FROM expenses e
            JOIN categories c ON e.category_id = c.id
            WHERE EXTRACT(YEAR FROM e.date) = $1 AND EXTRACT(MONTH FROM e.date) = $2
            ORDER BY e.date DESC;
        `,
			[year, month]
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send("Error fetching transactions for the selected month");
	}
});

app.listen(port, () => {
	console.log(`App listening at port ${port}`);
});


