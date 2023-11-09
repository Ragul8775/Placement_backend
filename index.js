const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const cors = require('cors');
const app = express();
const port = 8000;
const connection = require('./database/connection');
const xlsx = require('xlsx');
const fs = require('fs');

// Configuration
app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileData = req.file.buffer;

    // Save the buffer to a temporary file
    const tempFilePath = 'temp.xlsx';
    fs.writeFileSync(tempFilePath, fileData);

    console.log('File saved to:', tempFilePath);

    // Read the temporary file using xlsx
    const newFile = xlsx.readFile(tempFilePath);
    const worksheet = newFile.Sheets[newFile.SheetNames[0]];
    const range = xlsx.utils.decode_range(worksheet['!ref']);

    // Import excel
    for (let row = range.s.r; row <= range.e.r; row++) {
        const data = []; // Declare and initialize data array here

        let rowHasData = false;

        for (let col = range.s.c; col <= range.e.c; col++) {
            let cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];

            if (cell) {
                data.push(cell.v);
                rowHasData = true;
            }
        }

        if (rowHasData) {
            console.log(data);

            // Insert data into the database
            const sql = "INSERT INTO `year_2023`(`reg.no`,`full_name`,`gender`,`dob`,`section`,`fa`,`srm_mail`,`personal_mail`,`mobile`,`alt_no`) VALUES(?,?,?,?,?,?,?,?,?,?)";
            connection.query(sql, data, (err, results, fields) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log("User ID:" + results.insertId);
            });
        }
    }

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    res.send('File uploaded and data processed successfully.');
});

//sql importing

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    connection.connect((err) => {
        if (err) throw err;
        console.log('Database connected');
    });
});
