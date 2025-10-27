import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export class DatabaseConnection {
  private connection: mysql.Connection | null = null;
  private db: ReturnType<typeof drizzle> | null = null;

  constructor() {
    // Don't connect in constructor - connect when needed
  }

  public async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        database: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD || "",
        charset: "utf8mb4",
      });

      this.db = drizzle(this.connection, { schema, mode: "default" });
      console.log(`Connected to MySQL database: ${process.env.DB_NAME}`);
    } catch (error) {
      console.error("Error connecting to MySQL:", error);
      throw error;
    }
  }

  public getDb() {
    if (!this.db) {
      throw new Error("Database connection not established");
    }
    return this.db;
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      console.log("MySQL connection closed");
    }
  }

  public async executeDrizzleQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string = "Unknown query"
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      // Standardized log format
      const timeStr = queryTime.toString().padStart(4, " ");
      console.log(`${timeStr}ms | ${queryName}`);

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const timeStr = queryTime.toString().padStart(4, " ");
      console.error(`[ERROR] ${timeStr}ms | ${queryName}`);
      throw error;
    }
  }
}
