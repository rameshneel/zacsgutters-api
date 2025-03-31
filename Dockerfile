# ====== BUILD STAGE ======
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for build
RUN apk add --no-cache python3 make g++ curl 

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies with exact versions
RUN npm ci --production=false

# Copy source code
COPY . .
RUN mkdir -p /app/logs  # Explicitly create logs directory
# Agar local mein logs folder hai to COPY . . se aayega, warna khali folder banega
# RUN npm run build
# RUN npm test
# Build and test if needed
# RUN npm run build
# RUN npm test

# ====== PRODUCTION STAGE ======
FROM node:20-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Set non-root user for security
USER node

# Create app directory and set permissions
WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/logs ./logs 

# Add custom NODE_PATH if needed
ENV NODE_PATH=/app/node_modules

# Run security audit
RUN npm audit --production --audit-level=high

# Expose port
EXPOSE 3000

# Production-ready health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node src/healthcheck.js || exit 1

# Define startup command
CMD ["node", "src/index.js"]