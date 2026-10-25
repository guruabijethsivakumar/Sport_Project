# Stage 1: Build TypeScript server
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Start server
CMD ["node", "dist/server.js"]
