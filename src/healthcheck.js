// src/healthcheck.js
import http from "http";
import https from "https";
import { promisify } from "util";
import { execSync } from "child_process";
import fs from "fs";

// Configuration
const config = {
  port: process.env.PORT || 3000,
  endpoint: "/health",
  timeout: 3000,
  protocol: "http",
  verbose: false,
};

// Check if MongoDB is connected
async function checkMongoDBConnection() {
  try {
    const mongoose = await import("mongoose");
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Check if API is responding
async function checkAPIHealth() {
  return new Promise((resolve) => {
    const requestOptions = {
      hostname: "localhost",
      port: config.port,
      path: config.endpoint,
      timeout: config.timeout,
      method: "GET",
    };

    const requester = config.protocol === "https" ? https : http;
    const req = requester.request(requestOptions, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on("error", () => {
      resolve(false);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Check system resources
async function checkSystemResources() {
  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercentage = (memoryUsage.rss / (1024 * 1024 * 512)) * 100; // Assuming 512MB limit

    // Check CPU usage (simplified)
    const cpuUsage = process.cpuUsage();

    // Check disk space
    const diskUsage = execSync("df -h / | tail -1 | awk '{print $5}'")
      .toString()
      .trim();
    const diskUsagePercentage = parseInt(diskUsage.replace("%", ""));

    return {
      memory: memoryUsagePercentage < 90,
      cpu: true, // Simplified check
      disk: diskUsagePercentage < 90,
    };
  } catch (error) {
    return {
      memory: true,
      cpu: true,
      disk: true,
    };
  }
}

// Main health check function
async function performHealthCheck() {
  try {
    // Check API health
    const apiHealthy = await checkAPIHealth();
    console.log("API Health Check:", apiHealthy);
    if (!apiHealthy) {
      process.exit(1);
    }

    // Check MongoDB connection
    const mongoConnected = await checkMongoDBConnection();
    console.log("MongoDB Connection Check:", mongoConnected);
    if (!mongoConnected) {
      process.exit(1);
    }

    // Check system resources
    const systemResources = await checkSystemResources();
    console.log("System Resources Check:", systemResources);
    if (!systemResources.memory || !systemResources.disk) {
      process.exit(1);
    }

    // All checks passed
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Run the health check
performHealthCheck();
