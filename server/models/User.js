import { pool } from '../../server/config/database.js';
import { hash, compare } from 'bcryptjs';

async function createUser(username, password) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, await hash(password, 10)]
    );
    await client.query('COMMIT');
    return result.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in createUser:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function getUserByCredentials(username, password) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return null;
    }
    const user = result.rows[0];
    const isValid = await compare(password, user.password);
    if (!isValid) {
      return null;
    }
    return { id: user.id, username: user.username };
  } catch (error) {
    console.error('Error in getUserByCredentials:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

export default { createUser, getUserByCredentials };
