import cron from "node-cron";
import { DatabaseConnection } from "./database";
import { MetricsProcessor } from "./metrics-processor";

export class MetricsRunner {
  private db: DatabaseConnection;

  constructor() {
    this.db = new DatabaseConnection();
  }

  async runDailyMetrics(): Promise<boolean> {
    console.log("Starting daily metrics processing...");

    try {
      // Connect to database first
      await this.db.connect();

      const processor = new MetricsProcessor(this.db);
      const success = await processor.processAllMetrics();

      if (success) {
        console.log("Daily metrics processing completed successfully");
        return true;
      } else {
        console.error("Daily metrics processing failed");
        return false;
      }
    } catch (error) {
      console.error("Unexpected error during metrics processing:", error);
      return false;
    }
  }

  async runOnce(): Promise<boolean> {
    console.log("Running metrics processing once...");
    return await this.runDailyMetrics();
  }

  async runScheduled(): Promise<void> {
    console.log("Starting scheduled metrics runner...");

    // Schedule the job to run daily at 2 AM
    cron.schedule(
      "0 2 * * *",
      async () => {
        console.log("Scheduled metrics processing started");
        await this.runDailyMetrics();
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    console.log("Scheduled daily metrics processing at 02:00 UTC");
    this.setupProcessHandlers();
  }

  async runTestMode(): Promise<void> {
    console.log("Starting TEST MODE - running metrics every minute...");

    // Schedule the job to run every minute for testing
    cron.schedule(
      "* * * * *", // Every minute
      async () => {
        console.log("🧪 TEST MODE: Running metrics processing...");
        await this.runDailyMetrics();
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    console.log("🧪 TEST MODE: Scheduled metrics processing every minute");
    this.setupProcessHandlers();
  }

  private setupProcessHandlers(): void {
    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("Metrics runner stopped by user");
      await this.db.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Metrics runner terminated");
      await this.db.disconnect();
      process.exit(0);
    });

    // Keep the process alive
    setInterval(() => {
      // Just keep the process running
    }, 60000); // Check every minute
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }
}
