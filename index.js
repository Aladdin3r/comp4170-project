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
      `
    );

    // Fetch budgets for each category and calculate remaining budget
    const budgetsResult = await db.query(
      `SELECT budgets.id, budgets.amount, categories.name AS category 
      FROM budgets 
      JOIN categories ON budgets.category_id = categories.id`
    );

    // Calculate total expenses per category
    const totalExpensesPerCategory = expensesResult.rows.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {});

    // Calculate the remaining budget for each category
    const budgets = budgetsResult.rows.map(budget => {
      const totalExpense = totalExpensesPerCategory[budget.category] || 0;
      const remainingBudget = budget.amount - totalExpense;
      return {
        ...budget,
        totalExpense: totalExpense,
        remainingBudget: remainingBudget,
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
        await db.query(
          "UPDATE budgets SET amount = $1 WHERE category_id = $2",
          [amount, category_id]
        );
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

// Custom month transactions
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

// Start the server
app.listen(port, () => {
  console.log(`App listening at port ${port}`);
});
