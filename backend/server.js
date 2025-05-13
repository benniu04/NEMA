import express from 'express';
import mongoose from 'mongoose';
import moviesRoutes from './routes/movies.routes.js';
import authRoutes from './routes/auth.routes.js';
import cors from 'cors';

import {connectDB} from './config/db.js';
import {ENV_VARS} from './config/envVars.js';

const app = express();

const PORT = ENV_VARS.PORT;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/movies', moviesRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});