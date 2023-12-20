const express = require('express');

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
app.use(reqLogger);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
function reqLogger(req, res, next) {
    console.log(`${req.method}: ${req.url}`);
    next();
  }
  app.post('/upload', upload.single('file'), (req, res) => {
    const { year } = req.query;
    
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
            console.log(year);
            
            // Insert data into the database
            const sql = `INSERT INTO \`${year}\` (
                \`reg_no\`, 
                \`full_name\`, 
                \`gender\`, 
                \`nri\`, 
                \`dob\`, 
                \`specialization\`, 
                \`section\`, 
                \`srm_mail\`, 
                \`personal_mail\`, 
                \`mobile_no\`, 
                \`alternative_no\`, 
                \`father_no\`, 
                \`father_mail\`, 
                \`mother_no\`, 
                \`mother_mail\`, 
                \`guardian_no\`, 
                \`fa\`, 
                \`languages\`
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
              
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
app.get('/availableYears', (req, res) => {
    const sql = "SHOW TABLES LIKE '20%'";
    connection.query(sql, (err, results, fields) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Internal Server error");
        }

        

        const availableYears = results.map((result) => {
            const tableNameKey = `Tables_in_placement_employee (20%)`;

            if (result[tableNameKey]) {
                // Extract the year from the table name using a regular expression
                const match = result[tableNameKey].match(/\d+/);
                return match ? match[0] : null;
            }

            return null;  // or any other appropriate value if the key is not present
        });

        console.log(availableYears);

        // Filter out null values before sending the response
        return res.json({ availableYears: availableYears.filter(year => year !== null) });
    });
});

  
/* creating Table */
app.post('/createTable', (req, res) => {
    const { year } = req.body;
    const sql = `CREATE TABLE IF NOT EXISTS \`${year}\` (
        \`s.no\` INT NOT NULL AUTO_INCREMENT,
        \`reg_no\` VARCHAR(45) NOT NULL,
        \`full_name\` VARCHAR(45) NULL,
        \`gender\` VARCHAR(45) NOT NULL,
        \`nri\` VARCHAR(45) NOT NULL,
        \`dob\` VARCHAR(45) NULL,
        \`specialization\` VARCHAR(45) NOT NULL,
        \`section\` VARCHAR(45) NOT NULL,
        \`srm_mail\` VARCHAR(45) NOT NULL,
        \`personal_mail\` VARCHAR(45) NOT NULL,
        \`mobile_no\` VARCHAR(45) NOT NULL,
        \`alternative_no\` VARCHAR(45) NOT NULL,
        \`father_no\` VARCHAR(45) NOT NULL,
        \`father_mail\` VARCHAR(45) NOT NULL,
        \`mother_no\` VARCHAR(45) NOT NULL,
        \`mother_mail\` VARCHAR(45) NOT NULL,
        \`guardian_no\` VARCHAR(45) NOT NULL,
        \`fa\` VARCHAR(45) NOT NULL,
        \`languages\` VARCHAR(45) NOT NULL,
        \`status\` VARCHAR(45) NULL,
  
        PRIMARY KEY (\`s.no\`, \`reg_no\`),
        UNIQUE INDEX \`reg.no_UNIQUE\` (\`reg_no\` ASC) 
    )`;
    
    connection.query(sql, (err, results, fields) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Internal Server Error');
        }
        console.log(`Table ${year} created successfully.`);
        res.send(`Table ${year} created successfully.`);
    });
});
//section cards
app.get('/getSections/:year', (req, res) => {
    const { year } = req.params;

    // Query the database to get all details grouped by section for the specified year
    const sql = 'SELECT * FROM ?? ORDER BY section';
    const values = [year];

    connection.query(sql, values, (err, results, fields) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Internal Server Error');
        }

        // Organize data into sections
        const sectionData = {};
        results.forEach((result) => {
            const section = result.section;
            if (!sectionData[section]) {
                sectionData[section] = [];
            }
            sectionData[section].push(result);
        });

        // Send the grouped data to the frontend
        res.json({year, sectionData });
        
    });
});
//Section wise Data
app.get('/student-details/:year/:section',(req,res)=>{
    const {year, section} = req.params;
    const sql = `SELECT * FROM ?? WHERE section= ?`
    const values=[`${year}`, section]

    connection.query(sql,values,(err,results)=>{
        if(err){
            console.error('Error fetching student Details:',err.message)
            return res.status(500).send("Internal Server Error");
        }
        res.json({students:results});
        console.log(results)
    });
});

app.post('/update-student-statuses/:year', (req, res) => {
    const year = req.params.year;
    const students = req.body.students;

    if (!/^\d{4}$/.test(year)) {
        return res.status(400).send('Invalid year format.');
    }

    if (!students || !students.length) {
        return res.status(400).send('No student data provided.');
    }

    students.forEach(student => {
        const tableName = year; // The table name is the year
        const sql = `UPDATE \`${tableName}\` SET status = ? WHERE reg_no = ?`;
        const values = [student.status, student.reg_no];

        connection.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error updating student:', err.message);
                // Handle error
            }
        });
    });

    res.send('Student statuses updated successfully.');
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    connection.connect((err) => {
        if (err) throw err;
        console.log('Database connected');
    });
});
