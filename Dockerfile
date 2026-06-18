# Stage 1: Build the client assets and server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors and configuration files
COPY package*.json tsconfig.json vite.config.ts ./

# Install all dependencies (dev + production)
RUN npm install --no-audit --no-fund

# Copy the rest of the source code
COPY index.html server.ts ./
COPY src/ ./src/

# Build Vite client assets and bundle Express backend server with esbuild
RUN npm run build

# Stage 2: Production release
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production --no-audit --no-fund

# Copy built artifacts from stage 1
COPY --from=builder /app/dist ./dist

# Create the data directory for file-based database persistence
RUN mkdir -p /app/data

# Expose port 3000
EXPOSE 3000

# Run the compiled backend server
CMD ["node", "dist/server.cjs"]
