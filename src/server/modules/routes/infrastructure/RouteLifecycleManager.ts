import { db } from "../../../../db";
import { routes, joinRequests, notifications } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { RouteStatus } from "../../../../shared/enums";
import { NotificationFactory } from "../../notifications/NotificationFactory";

export class RouteLifecycleManager {
  private static isTransitioning = false;

  /**
   * Performs JIT transitions for all active routes:
   * 1. Transition to 'completed' when currentTime >= departureTime + 3 hours
   * 2. Transition to 'in_progress' when currentTime >= departureTime (and status is scheduled)
   */
  public static async performJitTransitions(): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      // Perform ACID updates and actions within a single safe sequence
      await db.transaction(async (tx) => {
        // --- 1. TRANSITION SCHEDULED/IN_PROGRESS TO COMPLETED ---
        // Find route IDs that need to be auto-completed
        const expiredRoutes = await tx
          .select({
            id: routes.id,
            destination: routes.destination,
            driverId: routes.driverId,
            status: routes.status,
          })
          .from(routes)
          .where(
            and(
              eq(routes.isActive, true),
              or(
                eq(routes.status, RouteStatus.SCHEDULED),
                eq(routes.status, RouteStatus.IN_PROGRESS)
              ),
              sql`${routes.departureTime} <= ${threeHoursAgo}`
            )
          );

        if (expiredRoutes.length > 0) {
          const expiredIds = expiredRoutes.map((r) => r.id);
          console.log(`[RouteLifecycleManager] Auto-completing ${expiredIds.length} routes:`, expiredIds);

          // Update status to COMPLETED
          await tx
            .update(routes)
            .set({ status: RouteStatus.COMPLETED })
            .where(
              and(
                or(
                  eq(routes.status, RouteStatus.SCHEDULED),
                  eq(routes.status, RouteStatus.IN_PROGRESS)
                ),
                sql`${routes.departureTime} <= ${threeHoursAgo}`
              )
            );

          // Build notifications for accepted passengers dynamically
          for (const route of expiredRoutes) {
            const acceptedPassengers = await tx
              .select({ passengerId: joinRequests.passengerId })
              .from(joinRequests)
              .where(
                and(
                  eq(joinRequests.routeId, route.id),
                  eq(joinRequests.status, "accepted")
                )
              );

            for (const passenger of acceptedPassengers) {
              // Ensure we don't insert duplicate completion notifications
              const existingNotif = await tx
                .select({ id: notifications.id })
                .from(notifications)
                .where(
                  and(
                    eq(notifications.userId, passenger.passengerId),
                    eq(notifications.type, "trip_completed")
                  )
                )
                .limit(1);

              const alreadyNotified = existingNotif.some((notif) => {
                // If existing checks, otherwise safe to skip if we just select count/exist
                return true;
              });

              if (existingNotif.length > 0) {
                continue;
              }

              const rawNotification = NotificationFactory.createTripCompleted(
                passenger.passengerId.toString(),
                route.id.toString(),
                route.destination
              );

              await tx.insert(notifications).values({
                userId: passenger.passengerId,
                title: rawNotification.title,
                description: rawNotification.description,
                type: rawNotification.type,
                data: rawNotification.data ? JSON.stringify(rawNotification.data) : null,
              });

              console.log(`[RouteLifecycleManager] Created unique TRIP_COMPLETED notification for passenger ${passenger.passengerId} on route ${route.id}`);
            }
          }
        }

        // --- 2. TRANSITION SCHEDULED TO IN_PROGRESS ---
        const startedRoutesResult = await tx
          .update(routes)
          .set({ status: RouteStatus.IN_PROGRESS })
          .where(
            and(
              eq(routes.status, RouteStatus.SCHEDULED),
              sql`${routes.departureTime} <= ${now}`
            )
          )
          .returning();

        if (startedRoutesResult.length > 0) {
          console.log(
            `[RouteLifecycleManager] JIT Auto-transitioned ${startedRoutesResult.length} scheduled routes to in_progress.`
          );
        }
      });
    } catch (error) {
      console.error("[RouteLifecycleManager] Error in performJitTransitions:", error);
    } finally {
      this.isTransitioning = false;
    }
  }
}
