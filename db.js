const { Client } = require("pg");

const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "expense_tracker",
    password: "Hello1234",
    port: 5432
});

client.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error("Connection error", err));

module.exports = client;
