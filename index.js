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

// Fetch categories, expenses, and budgets on the main page
app.get("/", async (req, res) => {
	try {
		// Fetch categories
		const categoriesResult = await db.query("SELECT * FROM categories");

		// Fetch expenses with categories joined
		const expensesResult = await db.query(
			`
			SELECT expenses.id, expenses.amount, categories.name AS category, 
			expenses.date FROM expenses 
			JOIN categories ON expenses.category_id = categories.id 
			ORDER BY date DESC
			LIMIT 10
      		`
		);

		// Fetch budgets for each category and calculate remaining budget
		const budgetsResult = await db.query(`
      SELECT b.id, b.amount AS budget, c.name AS category, 
          COALESCE(SUM(e.amount), 0) AS spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN expenses e ON e.category_id = b.category_id
      GROUP BY b.id, b.amount, c.name
      `);

		// Calculate total expenses per category
		const totalExpensesPerCategory = expensesResult.rows.reduce(
			(acc, expense) => {
				if (!acc[expense.category]) {
					acc[expense.category] = 0;
				}
				acc[expense.category] += expense.amount;
				return acc;
			},
			{}
		);

		// Calculate the remaining budget for each category
		const budgets = budgetsResult.rows.map((budget) => {
			const totalExpense = Number(budget.spent) || 0;
			const remainingBudget = Number(budget.budget) - totalExpense;
			return {
				...budget,
				spent: totalExpense.toFixed(2),
				remainingBudget: isNaN(remainingBudget)
					? "N/A"
					: remainingBudget.toFixed(2), // To prevent NaN
			};
		});

		// Format data for the view
		const expenses = expensesResult.rows;
		const categories = categoriesResult.rows;

		res.render("index", {
			categories: categories,
			expenses: expenses,
			budgets: budgets, // Pass the budgets with remaining amount to the template
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

		const categoryResult = await db.query(
			"SELECT name FROM categories WHERE id = $1",
			[category_id]
		);
		const categoryName = categoryResult.rows[0]?.name || "Unknown";

		// Log if it's an Income or Expense
		if (categoryName === "Income") {
			console.log(`Income logged: +$${amount} on ${date}`);
		} else {
			console.log(
				`Expense logged: -$${amount} on ${date} (Category: ${categoryName})`
			);
		}

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

// Handling budget creation or update
app.post("/budget", async (req, res) => {
	try {
		const { amount, category_id } = req.body;

		// Check if the required fields are present
		if (!amount || !category_id) {
			return res.status(400).send("Missing fields");
		}

		// Log values for debugging
		console.log("Amount:", amount, "Category ID:", category_id);

		// Check if the category exists
		const categoryCheck = await db.query(
			"SELECT * FROM categories WHERE id = $1",
			[category_id]
		);

		if (categoryCheck.rows.length === 0) {
			return res.status(400).send("Category does not exist");
		}

		// Check if a budget already exists for the given category
		const existingBudget = await db.query(
			"SELECT * FROM budgets WHERE category_id = $1",
			[category_id]
		);

		if (existingBudget.rows.length > 0) {
			// Update the existing budget
			console.log("Updating existing budget for category ID:", category_id);
			await db.query("UPDATE budgets SET amount = $1 WHERE category_id = $2", [
				amount,
				category_id,
			]);
		} else {
			// Insert a new budget if it doesn't exist
			console.log("Inserting new budget for category ID:", category_id);
			await db.query(
				"INSERT INTO budgets (amount, category_id) VALUES ($1, $2)",
				[amount, category_id]
			);
		}

		// Redirect to the main page after successful budget insert or update
		res.redirect("/");
	} catch (err) {
		console.error(err);
		res.status(500).send("Error setting budget");
	}
});

// FILTERING BUDGET
app.get("/budget/filter", async (req, res) => {
  try {
      const { year, month } = req.query;
      if (!year || !month) return res.status(400).send("Year and Month are required");

      const result = await db.query(
          `
          SELECT b.id, b.amount AS budget, c.name AS category, 
              COALESCE(SUM(e.amount), 0) AS spent, 
              (b.amount - COALESCE(SUM(e.amount), 0)) AS remaining
          FROM budgets b
          JOIN categories c ON b.category_id = c.id
          LEFT JOIN expenses e ON b.category_id = e.category_id 
              AND EXTRACT(YEAR FROM e.date) = $1 
              AND EXTRACT(MONTH FROM e.date) = $2
          GROUP BY b.id, c.name
          ORDER BY c.name;
          `,
          [year, month]
      );

      res.json(result.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching budget");
  }
});


// FILTERING EXPENSES
app.get("/transactions/filter", async (req, res) => {
	try {
		const { category, year, month, timeframe, order } = req.query;

		let query = `
        SELECT e.id, 
             CASE WHEN c.name = 'Income' THEN e.amount ELSE -e.amount END AS amount, 
             c.name AS category, 
             TO_CHAR(e.date, 'YYYY-MM-DD') AS date
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE 1=1
      `;

		let params = [];

		// Recent transactions (last 7 days) or this month
		if (timeframe === "recent") {
			query += ` AND e.date >= NOW() - INTERVAL '7 days'`;
		} else if (timeframe === "month") {
			query += ` AND EXTRACT(MONTH FROM e.date) = EXTRACT(MONTH FROM CURRENT_DATE)
               AND EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
		}

		// Filter by custom month/year
		if (year && month) {
			query += ` AND EXTRACT(YEAR FROM e.date) = $${params.length + 1} 
               AND EXTRACT(MONTH FROM e.date) = $${params.length + 2}`;
			params.push(year, month);
		}

		// Filter by category
		if (category) {
			query += ` AND c.name = $${params.length + 1}`;
			params.push(category);
		}

		// Sorting order (latest or oldest)
		query +=
			order === "oldest" ? " ORDER BY e.date ASC" : " ORDER BY e.date DESC";

		// Limit to 10 results for "recent"
		if (timeframe === "recent") {
			query += " LIMIT 10";
		}

		const result = await db.query(query, params);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send("Error fetching filtered transactions");
	}
});

// Start the server
app.listen(port, () => {
	console.log(`App listening at port ${port}`);
});

app.get("/budget/comparison", async (req, res) => {
	try {
		const incomeResult = await db.query(`
		SELECT COALESCE(SUM(e.amount), 0) AS total_income
		FROM expenses e
		JOIN categories c ON e.category_id = c.id
		WHERE c.name = 'Income'
		`);

		const expenseResult = await db.query(`
			SELECT COALESCE(SUM(e.amount), 0) AS total_expense
			FROM expenses e
			JOIN categories c ON e.category_id = c.id
			WHERE c.name != 'Income'
		`);

		console.log("Extracted Income:", incomeResult.rows[0]);
		console.log("Extracted Expense:", expenseResult.rows[0]);

		const totalIncome = incomeResult.rows[0]?.total_income || 0;
		const totalExpense = expenseResult.rows[0]?.total_expense || 0;
		const balance = totalIncome - totalExpense;

		res.json({
			totalIncome,
			totalExpense,
			balance,
		});
	} catch (err) {
		console.error("Error fetching budget comparison:", err);
		res.status(500).json({ error: "Internal server error" });
	}
});
