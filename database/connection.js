const mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    database:"placement_employee",
    user:'root',
    password:""
});

module.exports = connection;