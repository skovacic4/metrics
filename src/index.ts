import dotenv from "dotenv";
import { MetricsRunner } from "./metrics-runner";

// Load environment variables
dotenv.config();

function validateConfig(): boolean {
  const requiredVars = ["DB_NAME", "DB_USER"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  // Check if DB_PASSWORD is explicitly set (even if empty)
  if (!("DB_PASSWORD" in process.env)) {
    missingVars.push("DB_PASSWORD");
  }

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    console.error("Please create a .env file with the following variables:");
    console.error("DB_HOST=your_host");
    console.error("DB_PORT=3306");
    console.error("DB_NAME=your_database");
    console.error("DB_USER=your_username");
    console.error("DB_PASSWORD=your_password");
    return false;
  }

  return true;
}

async function main(): Promise<void> {
  console.log("Daily Metrics Runner starting...");

  // Validate configuration
  if (!validateConfig()) {
    process.exit(1);
  }

  // Create metrics runner
  const runner = new MetricsRunner();

  try {
    // Check command line arguments
    if (process.argv.includes("--once")) {
      // Run once and exit
      const success = await runner.runOnce();
      await runner.cleanup();
      process.exit(success ? 0 : 1);
    } else if (process.argv.includes("--test")) {
      // Run in test mode (every minute)
      await runner.runTestMode();
    } else {
      // Run on schedule (daily at 2 AM)
      await runner.runScheduled();
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    await runner.cleanup();
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
