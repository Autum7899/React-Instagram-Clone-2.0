const fs = require('fs');
const mysql = require('mysql2');
const path = require('path');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'moly7899',
  multipleStatements: true
});

db.connect(err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  
  console.log('Connected to MySQL. Creating database...');
  db.query('CREATE DATABASE IF NOT EXISTS insta;', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    
    console.log('Database created. Switching to insta database...');
    db.query('USE insta;', (err) => {
      if (err) {
        console.error('Error switching database:', err);
        process.exit(1);
      }
      
      console.log('Reading db.sql...');
      const sqlStr = fs.readFileSync(path.join(__dirname, 'db.sql'), 'utf8');
      
      console.log('Executing db.sql...');
      db.query(sqlStr, (err) => {
        if (err) {
          console.error('Error executing db.sql:', err);
          process.exit(1);
        }
        
        console.log('Database setup complete!');
        process.exit(0);
      });
    });
  });
});
