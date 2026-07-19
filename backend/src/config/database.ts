import mongoose from 'mongoose';
import { config } from '../config/env.js';

export async function connectDatabase(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 60000,
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (error: unknown) {
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : String(error));
      if (attempt === maxRetries) {
        console.log('Continuing without MongoDB...');
        console.log('Note: Some features requiring database will be unavailable.');
      } else {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
