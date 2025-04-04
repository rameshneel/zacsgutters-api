# Install dependencies including devDependencies (Development Stage)
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . . 
CMD ["npx", "nodemon", "src/index.js"]

# Production Stage
FROM node:20-alpine AS production
WORKDIR /app

# ✅ Copy only necessary files
COPY package*.json ./
RUN npm ci --only=production  # ✅ Install only production dependencies

# ✅ Copy compiled source code (If needed)
COPY --from=development /app/src ./src
COPY --from=development /app/public ./public
COPY --from=development /app/node_modules ./node_modules 

EXPOSE 3000
CMD ["node", "src/index.js"]


#  ====== STAGE 1: DEVELOPMENT ======
# FROM node:20-alpine AS development
# WORKDIR /app

# # Install dependencies including devDependencies
# COPY package*.json ./
# RUN npm install  # ✅ Install all dependencies (dev + prod)

# # Copy source code
# COPY . .

# # Use nodemon for auto-restart in development
# CMD ["npx", "nodemon", "src/index.js"]

# # ====== STAGE 2: PRODUCTION ======
# FROM node:20-alpine AS production
# WORKDIR /app

# # Install only production dependencies
# COPY package*.json ./
# RUN npm ci --only=production  # ✅ Install only production dependencies

# # Copy only necessary files from development stage
# COPY --from=development /app/src ./src
# COPY --from=development /app/public ./public

# # Expose only the required port
# EXPOSE 3000

# # Start the application
# CMD ["node", "src/index.js"]








#  ====== BUILD STAGE ======
# FROM node:20-alpine AS builder

# # Set working directory
# WORKDIR /app

# # Install dependencies for build
# RUN apk add --no-cache python3 make g++ curl 

# # Copy package files first (better caching)
# COPY package*.json ./

# # Install dependencies with exact versions
# RUN npm ci --production=false

# # Copy source code
# COPY . .
# RUN mkdir -p /app/logs  # Explicitly create logs directory
# # Agar local mein logs folder hai to COPY . . se aayega, warna khali folder banega
# # RUN npm run build
# # RUN npm test
# # Build and test if needed
# # RUN npm run build
# # RUN npm test

# # ====== PRODUCTION STAGE ======
# FROM node:20-alpine AS production

# # Set NODE_ENV
# ENV NODE_ENV=production

# # Set non-root user for security
# USER node

# # Create app directory and set permissions
# WORKDIR /app

# # Copy only necessary files from builder stage
# COPY --from=builder --chown=node:node /app/package*.json ./
# COPY --from=builder --chown=node:node /app/node_modules ./node_modules
# COPY --from=builder --chown=node:node /app/src ./src
# COPY --from=builder --chown=node:node /app/public ./public
# COPY --from=builder --chown=node:node /app/logs ./logs 

# # Add custom NODE_PATH if needed
# ENV NODE_PATH=/app/node_modules

# # Run security audit
# RUN npm audit --production --audit-level=high

# # Expose port
# EXPOSE 3000

# # Production-ready health check
# HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
#     CMD node src/healthcheck.js || exit 1

# # Define startup command
# CMD ["node", "src/index.js"]




# FROM node:20-alpine AS production
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --only=production  # ✅ Sirf production dependencies install karega
# COPY . .
# CMD ["node", "src/index.js"]  # ✅ Directly run karenge


# ✅ Pehle Build Stage
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./ 
# RUN npm ci
# COPY . .
# RUN npm run build  # ✅ TypeScript se JavaScript me convert hoga

# # ✅ Ab sirf zaroori cheezein Production Stage me copy karenge
# FROM node:20-alpine AS production
# WORKDIR /app
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/package*.json ./
# RUN npm ci --only=production
# CMD ["node", "dist/index.js"]
