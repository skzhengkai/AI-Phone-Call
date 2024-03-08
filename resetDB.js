const Database = require("@replit/database");

// Initialize the database
const db = new Database();

// Function to clear all keys in the database
async function clearDatabase() {
  try {
    // Get all the keys in the database
    const keys = await db.list();
    // Delete each key
    const deletePromises = keys.map(key => db.delete(key));
    // Wait for all keys to be deleted
    await Promise.all(deletePromises);
    console.log('Database has been cleared.');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}

// Call the function to clear the database
clearDatabase();
