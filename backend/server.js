import express from 'express';
import cookieParser from 'cookie-parser';
import moviesRoutes from './routes/movies.routes.js';
import authRoutes from './routes/auth.routes.js';
import cors from 'cors';
import uploadRoutes from './routes/upload.routes.js';

import {connectDB} from './config/db.js';
import {ENV_VARS} from './config/envVars.js';

const app = express();

const PORT = ENV_VARS.PORT;

app.use(cors({
  origin: [
    'https://nemaa.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'  
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/movies', moviesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});