require('dotenv').config()
const db = require('./config/Mysql')

const alterQuery1 = "ALTER TABLE posts ADD COLUMN isNSFW TINYINT(1) DEFAULT 0;"
const alterQuery2 = "ALTER TABLE posts ADD COLUMN nsfwTaggedByAuthor TINYINT(1) DEFAULT 0;"

db.query(alterQuery1, (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error("Error adding isNSFW:", err)
  } else {
    console.log("isNSFW added or already exists.")
  }

  db.query(alterQuery2, (err2) => {
    if (err2 && err2.code !== 'ER_DUP_FIELDNAME') {
      console.error("Error adding nsfwTaggedByAuthor:", err2)
    } else {
      console.log("nsfwTaggedByAuthor added or already exists.")
    }
    process.exit()
  })
})
