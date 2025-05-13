import express from 'express';

import {connectDB} from './config/db.js';
import {ENV_VARS} from './config/envVars.js';

const app = express();

const PORT = ENV_VARS.PORT;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});