import database from '../../server/config/database.js';
const { pool } = database;


async function createReport(userId, city, weatherData) {
    const client = await pool.connect();
    try {
      // Extract temperature and description with fallback values
      const temperature = weatherData?.current?.temperature || 0;  // Default to 0 if temperature is missing
      const description = weatherData?.current?.weather_descriptions?.[0]|| 'No description available';  // Default description if missing
  
      // Log the extracted values for debugging
      console.log(`Inserting report for ${city}: temperature=${temperature}, description=${description}`);
  
      // Start transaction
      await client.query('BEGIN');
  
      // Insert data into the weather_reports table
      const result = await client.query(
        'INSERT INTO weather_reports (user_id, city, temperature, description) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, city, temperature, description]
      );
  
      // Commit the transaction
      await client.query('COMMIT');
  
      // Return the inserted row's ID
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating weather report:', error);
  
      // Rollback the transaction in case of error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }
  
async function getReportsForUser(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, city, temperature, description, created_at FROM weather_reports WHERE user_id = $1', [userId]);
      return result.rows; // Return only the data rows
    }catch(err){
        console.error('Error in getting User Report',err)
        throw err;
    }
     finally {
      client.release();
    }
}

export {createReport, getReportsForUser}
  