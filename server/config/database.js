import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'weather_app_db',
  password: 'samrudh',
  port: 5432,
});

export default { pool };