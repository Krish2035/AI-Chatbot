import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chatRoutes';
import documentRoutes from './routes/documentRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api', chatRoutes);
app.use('/api/documents', documentRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI Chatbot API Server with Groq & HuggingFace Memory is running',
    docs: '/api/health'
  });
});

export default app;
