import {
  mysqlTable,
  int,
  varchar,
  decimal,
  date,
  timestamp,
  unique,
} from "drizzle-orm/mysql-core";

export const dailyMetrics = mysqlTable(
  "daily_metrics",
  {
    id: int("id").primaryKey().autoincrement(),
    aggregationDate: date("aggregation_date").notNull(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    metricValue: int("metric_value").notNull(),
    metricPercentage: decimal("metric_percentage", { precision: 5, scale: 2 }),
    metricCategory: varchar("metric_category", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    // Composite unique key for upserts
    uniqueMetric: unique("unique_daily_metric").on(
      table.aggregationDate,
      table.metricName
    ),
  })
);

export const eventMetrics = mysqlTable(
  "event_metrics",
  {
    id: int("id").primaryKey().autoincrement(),
    snapshotDate: date("snapshot_date").notNull(),
    eventId: int("event_id").notNull(),
    workspaceId: int("workspace_id").notNull(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    metricValue: int("metric_value").notNull(),
    metricPercentage: decimal("metric_percentage", { precision: 5, scale: 2 }),
    metricCategory: varchar("metric_category", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    // Composite unique key for upserts
    uniqueEventMetric: unique("unique_event_metric").on(
      table.snapshotDate,
      table.eventId,
      table.metricName
    ),
  })
);

export const participantMetrics = mysqlTable(
  "participant_metrics",
  {
    id: int("id").primaryKey().autoincrement(),
    snapshotDate: date("snapshot_date").notNull(),
    participantId: int("participant_id").notNull(),
    eventId: int("event_id").notNull(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    metricValue: int("metric_value").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    // Composite unique key for upserts
    uniqueParticipantMetric: unique("unique_participant_metric").on(
      table.snapshotDate,
      table.participantId,
      table.eventId,
      table.metricName
    ),
  })
);

// Source tables (for queries)
export const participants = mysqlTable("participants", {
  id: int("id").primaryKey().autoincrement(),
  settingsId: int("settings_id").notNull(),
  state: varchar("state", { length: 50 }),
  utmSource: varchar("utm_source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  workspaceId: int("workspace_id").notNull(),
  publishedAt: timestamp("published_at"),
  state: varchar("state", { length: 50 }),
  paymentsEnabled: int("payments_enabled").default(0),
  addons: varchar("addons", { length: 1000 }),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").primaryKey().autoincrement(),
  settingsId: int("settings_id").notNull(),
  hostId: int("host_id").notNull(),
  guestId: int("guest_id"),
  state: varchar("state", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  newsletterOptedInAt: timestamp("newsletter_opted_in_at"),
  newsletterOptedOutAt: timestamp("newsletter_opted_out_at"),
});

export const administrators = mysqlTable("administrators", {
  id: int("id").primaryKey().autoincrement(),
  dashboardOptIn: varchar("dashboard_opt_in", { length: 1 }),
});

export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type EventMetric = typeof eventMetrics.$inferSelect;
export type ParticipantMetric = typeof participantMetrics.$inferSelect;

export type NewDailyMetric = typeof dailyMetrics.$inferInsert;
export type NewEventMetric = typeof eventMetrics.$inferInsert;
export type NewParticipantMetric = typeof participantMetrics.$inferInsert;
