import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import authenticate from '../middleware/authorize.js'
import { createReport, getReportsForUser } from '../models/WeatherReport.js';
import database from '../../server/config/database.js';
const { pool } = database;
import dotenv from 'dotenv';
dotenv.config();


const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'your_weatherstack_api_key';

// Signup Route
router.post('/signup', async (req, res) => {
  console.log("Request body:", req.body);  // Log the request body to check its contents

  const { password, email,name } = req.body;
  console.log(password,email,name)

  if (!name || !email || !password) {
    console.log("problem")
    return res.status(400).json({ message: 'All fields are required' });
  }

  
  try {
    // Check if the user already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('userchech:',userCheck.rows)
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    console.log('user does not exist')

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);


    console.log('Executing SQL:', 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)');
    console.log('Values:', [name, email, hashedPassword]);
    // Insert the new user into the database
    await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );
  
    res.status(201).json({ message: 'User registered successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if the user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



const asyncHandler = fn => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  


// Weather API Route
router.get('/weather/:city', asyncHandler(async(req,res)=>{
    const { city } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
  
      // Fetch weather information from the WeatherStack API
      const weatherResponse = await axios.get(`http://api.weatherstack.com/current`, {
        params: {
          access_key: WEATHER_API_KEY,
          query: city,
        },
      });
  
      if (weatherResponse.data.error) {
        console.error(weatherResponse.data.error);
        return res.status(404).json({ message: 'City not found' });
      }
  
      console.log(weatherResponse.data);

      const weatherData = weatherResponse.data;
  
    // Extract the temperature
      const temperature = weatherResponse.data?.current?.temperature || 0; // Default to 0 if temperature is missing

    // Log the extracted temperature for debugging
      console.log(`Temperature for ${city}: ${temperature}`);
      
      // Log the search into the database
      await createReport(decoded.userId, city, weatherData);
  
      res.status(200).json({ city, weather: weatherData });
    } catch (error) {
      console.error(error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Invalid token' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
}));

// Route to fetch weather reports for the logged-in user
router.get('/weatherget/getreports', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    const userid= decoded.userId
    if(!userid) return res.status(400).json({message:'Invalid user'});
    // console.log(userid)

    // Fetch weather reports for the user
    const reports = await getReportsForUser(userid);
    // console.log(reports)
    if(reports.length===0) {return res.status(404).json({message:'no report'})}
    res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post("/verify", authenticate, (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

export default router;
