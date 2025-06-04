import mongoose from 'mongoose';
import {ENV_VARS} from "./envVars.js";

export const connectDB = async () => {

    try {
        const conn = await mongoose.connect(ENV_VARS.MONGO_URL, {
            // Enhanced security options
            authSource: 'admin',
            retryWrites: true,
            w: 'majority'
        });
        
        // Enable query logging in development only
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }
        
        console.log("MongoDB connected securely: " + conn.connection.host);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }

}