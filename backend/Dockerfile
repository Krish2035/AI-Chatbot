# ==========================================
# Multi-Stage Dockerfile for AI Chatbot Backend
# Node.js + Express + TypeScript + PostgreSQL pgvector + Redis
# ==========================================

# Stage 1: Build TypeScript source
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source files & compile
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript code & DB schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/schema.sql ./src/db/schema.sql
COPY --from=builder /app/src/db/schema.sql ./dist/db/schema.sql

# Expose backend API port
EXPOSE 5000

# Start server
CMD ["node", "dist/server.js"]
