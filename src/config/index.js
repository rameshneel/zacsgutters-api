// src/config/index.js

import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Determine the environment
const NODE_ENV = process.env.NODE_ENV || "development";

// Load environment-specific configuration
let envConfig = {};

const loadEnvConfig = async () => {
  try {
    const envConfigPath = path.resolve(
      __dirname,
      `./env/${process.env.NODE_ENV}.js`
    );
    if (fs.existsSync(envConfigPath)) {
      const envModule = await import(envConfigPath);
      envConfig = envModule.default || envModule;
    }
  } catch (error) {
    console.error(`Error loading environment config: ${error.message}`);
  }
};

// Call the function to load the environment config
loadEnvConfig();
// Default configuration
const defaultConfig = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    trustProxy: process.env.TRUST_PROXY === "true",
    useTLS: process.env.USE_TLS === "true",
    tlsKeyPath: process.env.TLS_KEY_PATH || "./config/tls/key.pem",
    tlsCertPath: process.env.TLS_CERT_PATH || "./config/tls/cert.pem",
    bodyLimit: process.env.BODY_LIMIT || "10mb",
    logLevel: process.env.LOG_LEVEL || "info",
    apiVersion: process.env.API_VERSION || "v1",
    rateLimiter: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
      standardHeaders: true,
      legacyHeaders: false,
    },
  },

  // Database configuration
  database: {
    mongo: {
      uri: process.env.MONGO_URI || "mongodb://localhost:27017/zacsgutter",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 100,
        minPoolSize: 5,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        w: "majority",
        wtimeoutMS: 10000,
      },
    },
    redis: {
      uri: process.env.REDIS_URI || "redis://localhost:6379",
      options: {
        password: process.env.REDIS_PASSWORD || "",
        db: parseInt(process.env.REDIS_DB || "0", 10),
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 5,
        enableReadyCheck: true,
        autoResendUnfulfilledCommands: true,
      },
    },
  },

  // Auth configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10),
    accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY || "3600", 10), // 1 hour
    refreshTokenExpiry: parseInt(
      process.env.REFRESH_TOKEN_EXPIRY || "2592000",
      10
    ), // 30 days
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
    filePath: process.env.LOG_FILE_PATH || "./logs/app.log",
    maxSize: process.env.LOG_MAX_SIZE || "10m",
    maxFiles: parseInt(process.env.LOG_MAX_FILES || "7", 10),
    colorize: process.env.LOG_COLORIZE === "true",
    timestamp: true,
  },

  // Cache configuration
  cache: {
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || "300", 10), // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || "600", 10), // 10 minutes
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || "1000", 10),
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || "5242880", 10), // 5MB
    maxFiles: parseInt(process.env.UPLOAD_MAX_FILES || "5", 10),
    allowedMimeTypes: (
      process.env.UPLOAD_ALLOWED_MIME_TYPES ||
      "image/jpeg,image/png,image/gif,application/pdf"
    ).split(","),
    storageType: process.env.UPLOAD_STORAGE_TYPE || "local", // 'local', 's3', etc.
    localStoragePath: process.env.UPLOAD_LOCAL_STORAGE_PATH || "./uploads",
    s3: {
      bucket: process.env.S3_BUCKET || "zacsgutter-uploads",
      region: process.env.S3_REGION || "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === "true",
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || "15000", 10), // 15 seconds
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === "true",
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || "9090", 10),
    sentryDSN: process.env.SENTRY_DSN || "",
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || NODE_ENV,
    sentryTracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"
    ),
  },

  // Feature flags
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION === "true",
    enablePasswordReset: process.env.ENABLE_PASSWORD_RESET === "true",
    enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN === "true",
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === "true",
  },

  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    service: process.env.EMAIL_SERVICE || "smtp",
    host: process.env.EMAIL_HOST || "smtp.example.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASS || "",
    },
    from: process.env.EMAIL_FROM || "noreply@example.com",
  },

  // Webhook configuration
  webhooks: {
    enabled: process.env.WEBHOOKS_ENABLED === "true",
    secret: process.env.WEBHOOKS_SECRET || "",
    endpoints: process.env.WEBHOOKS_ENDPOINTS
      ? JSON.parse(process.env.WEBHOOKS_ENDPOINTS)
      : [],
    retryAttempts: parseInt(process.env.WEBHOOKS_RETRY_ATTEMPTS || "3", 10),
    retryDelay: parseInt(process.env.WEBHOOKS_RETRY_DELAY || "5000", 10),
  },

  // Third-party service integrations
  services: {
    // Add any third-party service configs here
  },
};

// Merge default config with environment-specific config
const config = {
  ...defaultConfig,
  ...envConfig,
};

// Validate required configuration
const validateConfig = () => {
  const requiredVars = ["database.mongo.uri", "auth.jwtSecret"];

  const missingVars = requiredVars.filter((varPath) => {
    const path = varPath.split(".");
    let current = config;
    for (const key of path) {
      if (
        current[key] === undefined ||
        current[key] === null ||
        current[key] === ""
      ) {
        return true;
      }
      current = current[key];
    }
    return false;
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

// Validate config in non-test environments
if (NODE_ENV !== "test") {
  validateConfig();
}

// Export the config
export default config;
