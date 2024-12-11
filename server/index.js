import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRoutes from './router/router.js'; // use import instead of require

const { json } = bodyParser;

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(json());

// Register your routes
app.use('/api', apiRoutes);  

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
