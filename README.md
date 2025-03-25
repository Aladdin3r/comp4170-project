# Expense Tracker 
Rawan Aladdin, Jasmine Putri, Nea Pieroelie, Jerome Gache
## Task Completion
- Expense form, expense filter, styling (Nea)
- Backend expense logic and logging (Jasmine)
- Summary tallies and comparison (Jerome)
- Set budget and budget breakdown (Rawan)
## Running Instructions
1. Clone repo to local machine
2. Install any dependencies
   ``` npm i ```
3. Install local server called "expense_tracker" in pgAdmin
4. Connect database to project and access PostgreSQL in terminal by running the following:
  ```psql -U postgres```
 and:
```\c expense_tracker;```
5. Copy the following into pgAdmin query tool:
```markdown
   ```sql
      -- Drop existing tables if they exist
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS categories;

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Create expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    category_id INT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Create budgets table with a UNIQUE constraint on category_id to ensure only one budget per category
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL UNIQUE, -- Enforcing unique category_id to allow only one budget per category
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0), -- Budget must be positive
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT INTO categories (name) VALUES
('Income'),
('Food'),
('Rent'),
('Entertainment'),
('Transportation');

-- Insert example budgets
-- Insert or update budget amounts if the category exists
-- This is the logic to either insert a new budget or update an existing budget
DO $$ 
BEGIN
    -- Insert or update 'Food' budget
    IF NOT EXISTS (SELECT 1 FROM budgets WHERE category_id = (SELECT id FROM categories WHERE name = 'Food')) THEN
        INSERT INTO budgets (category_id, amount) 
        VALUES ((SELECT id FROM categories WHERE name = 'Food'), 500.00);
    ELSE
        UPDATE budgets 
        SET amount = 500.00
        WHERE category_id = (SELECT id FROM categories WHERE name = 'Food');
    END IF;
-- Insert or update 'Rent' budget
    IF NOT EXISTS (SELECT 1 FROM budgets WHERE category_id = (SELECT id FROM categories WHERE name = 'Rent')) THEN
        INSERT INTO budgets (category_id, amount) 
        VALUES ((SELECT id FROM categories WHERE name = 'Rent'), 1200.00);
    ELSE
        UPDATE budgets 
        SET amount = 1200.00
        WHERE category_id = (SELECT id FROM categories WHERE name = 'Rent');
    END IF;

    -- Insert or update 'Entertainment' budget
    IF NOT EXISTS (SELECT 1 FROM budgets WHERE category_id = (SELECT id FROM categories WHERE name = 'Entertainment')) THEN
        INSERT INTO budgets (category_id, amount) 
        VALUES ((SELECT id FROM categories WHERE name = 'Entertainment'), 200.00);
    ELSE
        UPDATE budgets 
        SET amount = 200.00
        WHERE category_id = (SELECT id FROM categories WHERE name = 'Entertainment');
    END IF;
END $$;
   ```
```
```
7. Run the project:
   ```node index.js```
