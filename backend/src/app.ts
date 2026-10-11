import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import chatRoutes from './routes/chatRoutes';
import documentRoutes from './routes/documentRoutes';
import authRoutes from './routes/authRoutes';
import { cdnMiddleware } from './middleware/cdnMiddleware';
import { generalLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();

// Performance & CDN Middlewares
app.use(compression());
app.use(cdnMiddleware);

// Security & Parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global Rate Limiting
app.use(generalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);
app.use('/api/documents', documentRoutes);

// Root Endpoint with architectural status
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI Chatbot Enterprise Backend is running',
    architecture: {
      loadBalancer: 'Node Cluster / Multi-worker Ready',
      database: 'PostgreSQL with pgvector',
      readReplicas: 'Dual Primary / Replica Pooling Enabled',
      caching: 'Redis / In-memory Multi-tier Cache',
      queue: 'BullMQ Async Task Pipeline',
      orm: 'Drizzle ORM + PG Pool',
      searchIndexing: 'GIN Full-Text tsvector + HNSW Vector Search',
      security: 'Bcrypt Hash + JWT + Express Rate Limiting',
      cdn: 'Edge Cache-Control + Compression'
    },
    docs: '/api/health'
  });
});

export default app;
