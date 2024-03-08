const Database = require('@replit/database');
const fs = require('fs');

const db = new Database();

async function exportReplitDbToJsonFile() {
  try {
    // Get all the keys in the database
    const keys = await db.list();
    const dbData = {};

    // Get the value for each key and store it in the dbData object
    for (const key of keys) {
      dbData[key] = await db.get(key);
    }

    // Convert the dbData object to a JSON string
    const jsonContent = JSON.stringify(dbData, null, 2);

    // Write the JSON string to a file
    fs.writeFile('replit_db.json', jsonContent, 'utf8', function (err) {
      if (err) {
        console.log('An error occurred while writing JSON Object to File.');
        return console.log(err);
      }

      console.log('JSON file has been saved.');
    });
  } catch (error) {
    console.error('Failed to export Replit DB to JSON', error);
  }
}

exportReplitDbToJsonFile();
