import { eq, sql, count, sum, and } from "drizzle-orm";
import { DatabaseConnection } from "./database";
import {
  dailyMetrics,
  eventMetrics,
  participantMetrics,
  participants,
  settings,
  bookings,
  users,
  administrators,
  type NewDailyMetric,
  type NewEventMetric,
  type NewParticipantMetric,
} from "./schema";

export interface MetricResult {
  aggregationDate: Date;
  metricName: string;
  metricValue: number;
  metricPercentage?: number;
  metricCategory: string;
  eventId?: number;
  workspaceId?: number;
  participantId?: number;
}

export class MetricsProcessor {
  private db: DatabaseConnection;
  private targetDate: Date;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.targetDate = new Date();
    this.targetDate.setDate(this.targetDate.getDate() - 1); // Previous day
  }

  async calculateGlobalMetrics(): Promise<NewDailyMetric[]> {
    console.log("Calculating global metrics...");
    const metrics: NewDailyMetric[] = [];
    const drizzle = this.db.getDb();

    // Total participants (cumulative)
    const totalParticipantsResult = await this.db.executeDrizzleQuery(
      async () => {
        const query = drizzle
          .select({ count: count() })
          .from(participants)
          .innerJoin(settings, eq(participants.settingsId, settings.id))
          .where(eq(settings.state, "online"));

        console.log("SQL for Total Participants:", query.toSQL());
        return await query;
      },
      "Total participants query"
    );

    metrics.push({
      aggregationDate: this.targetDate,
      metricName: "total_participants",
      metricValue: totalParticipantsResult[0].count,
      metricCategory: "participants",
    });

    // New participants (daily)
    const newParticipantsResult = await this.db.executeDrizzleQuery(
      async () => {
        return await drizzle
          .select({ count: count() })
          .from(participants)
          .innerJoin(settings, eq(participants.settingsId, settings.id))
          .where(
            and(
              eq(settings.state, "online"),
              sql`DATE(${participants.createdAt}) = ${
                this.targetDate.toISOString().split("T")[0]
              }`
            )
          );
      },
      "New participants query"
    );

    metrics.push({
      aggregationDate: this.targetDate,
      metricName: "new_participants",
      metricValue: newParticipantsResult[0].count,
      metricCategory: "participants",
    });

    // Registered participants
    const registeredParticipantsResult = await this.db.executeDrizzleQuery(
      async () => {
        return await drizzle
          .select({ count: count() })
          .from(participants)
          .innerJoin(settings, eq(participants.settingsId, settings.id))
          .where(
            and(
              eq(settings.state, "online"),
              eq(participants.state, "registered")
            )
          );
      },
      "Registered participants query"
    );

    metrics.push({
      aggregationDate: this.targetDate,
      metricName: "registered_participants",
      metricValue: registeredParticipantsResult[0].count,
      metricCategory: "participants",
    });

    // Meeting counts by state
    const meetingsByStateResult = await this.db.executeDrizzleQuery(
      async () => {
        return await drizzle
          .select({
            bookingState: sql<string>`COALESCE(${bookings.state}, 'unknown')`,
            stateCount: count(),
          })
          .from(bookings)
          .innerJoin(settings, eq(bookings.settingsId, settings.id))
          .where(eq(settings.state, "online"))
          .groupBy(sql`COALESCE(${bookings.state}, 'unknown')`);
      },
      "Meetings by state query"
    );

    for (const row of meetingsByStateResult) {
      metrics.push({
        aggregationDate: this.targetDate,
        metricName: `meetings_${row.bookingState}`,
        metricValue: row.stateCount,
        metricCategory: "meetings",
      });
    }

    // Total meetings
    const totalMeetingsResult = await this.db.executeDrizzleQuery(async () => {
      return await drizzle
        .select({ count: count() })
        .from(bookings)
        .innerJoin(settings, eq(bookings.settingsId, settings.id))
        .where(eq(settings.state, "online"));
    }, "Total meetings query");

    metrics.push({
      aggregationDate: this.targetDate,
      metricName: "total_meetings",
      metricValue: totalMeetingsResult[0].count,
      metricCategory: "meetings",
    });

    // Newsletter metrics
    const newsletterResult = await this.db.executeDrizzleQuery(async () => {
      return await drizzle
        .select({
          totalUsers: count(),
          optedIn: sum(
            sql`CASE WHEN ${users.newsletterOptedInAt} IS NOT NULL THEN 1 ELSE 0 END`
          ),
          optedOut: sum(
            sql`CASE WHEN ${users.newsletterOptedOutAt} IS NOT NULL THEN 1 ELSE 0 END`
          ),
        })
        .from(users);
    }, "Newsletter metrics query");

    const newsletterData = newsletterResult[0];
    const totalUsers = newsletterData.totalUsers;
    const optedIn = Number(newsletterData.optedIn || 0);
    const optedOut = Number(newsletterData.optedOut || 0);

    metrics.push(
      {
        aggregationDate: this.targetDate,
        metricName: "newsletter_opted_in",
        metricValue: optedIn,
        metricPercentage:
          totalUsers > 0
            ? (
                Math.round(((optedIn * 100.0) / totalUsers) * 100) / 100
              ).toString()
            : "0",
        metricCategory: "newsletter",
      },
      {
        aggregationDate: this.targetDate,
        metricName: "newsletter_opted_out",
        metricValue: optedOut,
        metricPercentage:
          totalUsers > 0
            ? (
                Math.round(((optedOut * 100.0) / totalUsers) * 100) / 100
              ).toString()
            : "0",
        metricCategory: "newsletter",
      }
    );

    // Dashboard metrics
    const dashboardResult = await this.db.executeDrizzleQuery(async () => {
      return await drizzle
        .select({
          totalAdmins: count(),
          optedIn: sum(
            sql`CASE WHEN ${administrators.dashboardOptIn} = '1' THEN 1 ELSE 0 END`
          ),
          optedOut: sum(
            sql`CASE WHEN ${administrators.dashboardOptIn} = '0' THEN 1 ELSE 0 END`
          ),
        })
        .from(administrators);
    }, "Dashboard metrics query");

    const dashboardData = dashboardResult[0];
    const totalAdmins = dashboardData.totalAdmins;
    const dashboardOptedIn = Number(dashboardData.optedIn || 0);
    const dashboardOptedOut = Number(dashboardData.optedOut || 0);

    metrics.push(
      {
        aggregationDate: this.targetDate,
        metricName: "dashboard_opted_in",
        metricValue: dashboardOptedIn,
        metricPercentage:
          totalAdmins > 0
            ? (
                Math.round(((dashboardOptedIn * 100.0) / totalAdmins) * 100) /
                100
              ).toString()
            : "0",
        metricCategory: "app_usage",
      },
      {
        aggregationDate: this.targetDate,
        metricName: "dashboard_opted_out",
        metricValue: dashboardOptedOut,
        metricPercentage:
          totalAdmins > 0
            ? (
                Math.round(((dashboardOptedOut * 100.0) / totalAdmins) * 100) /
                100
              ).toString()
            : "0",
        metricCategory: "app_usage",
      }
    );

    console.log(`Calculated ${metrics.length} global metrics`);
    return metrics;
  }

  async calculateEventMetrics(): Promise<NewEventMetric[]> {
    console.log("Calculating event metrics...");
    const metrics: NewEventMetric[] = [];
    const drizzle = this.db.getDb();

    // Get all online events
    const eventsResult = await this.db.executeDrizzleQuery(async () => {
      return await drizzle
        .select({
          id: settings.id,
          workspaceId: settings.workspaceId,
        })
        .from(settings)
        .where(eq(settings.state, "online"));
    }, "Events query");

    for (const event of eventsResult) {
      // Participant count for this event
      const participantCountResult = await drizzle
        .select({ count: count() })
        .from(participants)
        .where(eq(participants.settingsId, event.id));

      metrics.push({
        snapshotDate: this.targetDate,
        eventId: event.id,
        workspaceId: event.workspaceId,
        metricName: "participant_count",
        metricValue: participantCountResult[0].count,
        metricCategory: "participants",
      });

      // Meeting counts by state for this event
      const meetingsByStateResult = await drizzle
        .select({
          bookingState: sql<string>`COALESCE(${bookings.state}, 'unknown')`,
          stateCount: count(),
        })
        .from(bookings)
        .where(eq(bookings.settingsId, event.id))
        .groupBy(sql`COALESCE(${bookings.state}, 'unknown')`);

      for (const row of meetingsByStateResult) {
        metrics.push({
          snapshotDate: this.targetDate,
          eventId: event.id,
          workspaceId: event.workspaceId,
          metricName: `meetings_${row.bookingState}`,
          metricValue: row.stateCount,
          metricCategory: "meetings",
        });
      }

      // Meeting acceptance rate
      const acceptanceResult = await drizzle
        .select({
          totalMeetings: count(),
          acceptedMeetings: sum(
            sql`CASE WHEN ${bookings.state} = 'accepted' THEN 1 ELSE 0 END`
          ),
        })
        .from(bookings)
        .where(eq(bookings.settingsId, event.id));

      const acceptanceData = acceptanceResult[0];
      const totalMeetings = acceptanceData.totalMeetings;
      const acceptedMeetings = Number(acceptanceData.acceptedMeetings || 0);

      metrics.push({
        snapshotDate: this.targetDate,
        eventId: event.id,
        workspaceId: event.workspaceId,
        metricName: "meeting_acceptance_rate",
        metricValue: acceptedMeetings,
        metricPercentage:
          totalMeetings > 0
            ? (
                Math.round(((acceptedMeetings * 100.0) / totalMeetings) * 100) /
                100
              ).toString()
            : "0",
        metricCategory: "meetings",
      });
    }

    console.log(`Calculated ${metrics.length} event metrics`);
    return metrics;
  }

  async calculateParticipantMetrics(): Promise<NewParticipantMetric[]> {
    console.log("Calculating participant metrics...");
    const metrics: NewParticipantMetric[] = [];
    const drizzle = this.db.getDb();

    // Get all participants with their events
    const participantsResult = await this.db.executeDrizzleQuery(async () => {
      return await drizzle
        .select({
          participantId: participants.id,
          eventId: participants.settingsId,
        })
        .from(participants)
        .innerJoin(settings, eq(participants.settingsId, settings.id))
        .where(eq(settings.state, "online"));
    }, "Participants query");

    for (const participant of participantsResult) {
      // Count meetings as host
      const hostMeetingsResult = await drizzle
        .select({
          bookingState: sql<string>`COALESCE(${bookings.state}, 'unknown')`,
          stateCount: count(),
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.hostId, participant.participantId),
            eq(bookings.settingsId, participant.eventId)
          )
        )
        .groupBy(sql`COALESCE(${bookings.state}, 'unknown')`);

      // Count meetings as guest
      const guestMeetingsResult = await drizzle
        .select({
          bookingState: sql<string>`COALESCE(${bookings.state}, 'unknown')`,
          stateCount: count(),
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.guestId, participant.participantId),
            eq(bookings.settingsId, participant.eventId)
          )
        )
        .groupBy(sql`COALESCE(${bookings.state}, 'unknown')`);

      // Combine host and guest meetings
      const meetingCounts: Record<string, number> = {};

      for (const row of hostMeetingsResult) {
        meetingCounts[row.bookingState] =
          (meetingCounts[row.bookingState] || 0) + row.stateCount;
      }

      for (const row of guestMeetingsResult) {
        meetingCounts[row.bookingState] =
          (meetingCounts[row.bookingState] || 0) + row.stateCount;
      }

      // Create metrics for each meeting state
      for (const [state, count] of Object.entries(meetingCounts)) {
        metrics.push({
          snapshotDate: this.targetDate,
          participantId: participant.participantId,
          eventId: participant.eventId,
          metricName: `meetings_${state}`,
          metricValue: count,
        });
      }

      // Total meetings for this participant
      const totalMeetings = Object.values(meetingCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      metrics.push({
        snapshotDate: this.targetDate,
        participantId: participant.participantId,
        eventId: participant.eventId,
        metricName: "total_meetings",
        metricValue: totalMeetings,
      });
    }

    console.log(`Calculated ${metrics.length} participant metrics`);
    return metrics;
  }

  async processAllMetrics(): Promise<boolean> {
    try {
      const drizzle = this.db.getDb();

      // Calculate all metrics
      const globalMetrics = await this.calculateGlobalMetrics();
      const eventMetricsData = await this.calculateEventMetrics();
      const participantMetricsData = await this.calculateParticipantMetrics();

      // Store metrics in database with upsert
      if (globalMetrics.length > 0) {
        await drizzle
          .insert(dailyMetrics)
          .values(globalMetrics)
          .onDuplicateKeyUpdate({
            set: {
              metricValue: sql`VALUES(${dailyMetrics.metricValue})`,
              metricPercentage: sql`VALUES(${dailyMetrics.metricPercentage})`,
            },
          });
        console.log(`Inserted ${globalMetrics.length} global metrics`);
      }

      if (eventMetricsData.length > 0) {
        await drizzle
          .insert(eventMetrics)
          .values(eventMetricsData)
          .onDuplicateKeyUpdate({
            set: {
              metricValue: sql`VALUES(${eventMetrics.metricValue})`,
              metricPercentage: sql`VALUES(${eventMetrics.metricPercentage})`,
            },
          });
        console.log(`Inserted ${eventMetricsData.length} event metrics`);
      }

      if (participantMetricsData.length > 0) {
        await drizzle
          .insert(participantMetrics)
          .values(participantMetricsData)
          .onDuplicateKeyUpdate({
            set: {
              metricValue: sql`VALUES(${participantMetrics.metricValue})`,
            },
          });
        console.log(
          `Inserted ${participantMetricsData.length} participant metrics`
        );
      }

      const totalMetrics =
        globalMetrics.length +
        eventMetricsData.length +
        participantMetricsData.length;
      console.log(`Successfully processed ${totalMetrics} total metrics`);
      return true;
    } catch (error) {
      console.error("Error processing metrics:", error);
      return false;
    }
  }
}
