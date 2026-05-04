import { AdminRole } from "@prisma/client";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/overview",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const last30 = subDays(today, 29);
    const prev30 = subDays(today, 59);

    const [dau, mau, totalUsers, activeUsers, bannedUsers, events30, eventsPrev30, purchases] = await Promise.all([
      prisma.event.findMany({
        where: { createdAt: { gte: today }, userId: { not: null } },
        distinct: ["userId"],
        select: { userId: true }
      }),
      prisma.event.findMany({
        where: { createdAt: { gte: last30 }, userId: { not: null } },
        distinct: ["userId"],
        select: { userId: true }
      }),
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.event.count({ where: { createdAt: { gte: last30 } } }),
      prisma.event.count({ where: { createdAt: { gte: prev30, lt: last30 } } }),
      prisma.event.findMany({
        where: { eventName: "purchase_made", createdAt: { gte: last30 } },
        select: { properties: true }
      })
    ]);

    const revenue = purchases.reduce((sum, event) => {
      const value = event.properties && typeof event.properties === "object" && "amount" in event.properties
        ? Number(event.properties.amount)
        : 0;
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const retentionRate = totalUsers > 0 ? Math.round((mau.length / totalUsers) * 100) : 0;
    const eventGrowth = eventsPrev30 > 0 ? Math.round(((events30 - eventsPrev30) / eventsPrev30) * 100) : 100;

    return res.json({
      metrics: {
        dau: dau.length,
        mau: mau.length,
        totalUsers,
        activeUsers,
        bannedUsers,
        events30,
        eventGrowth,
        retentionRate,
        revenue
      }
    });
  })
);

router.get(
  "/timeseries",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const end = startOfDay(new Date());
    const start = subDays(end, 29);
    const days = eachDayOfInterval({ start, end });

    const events = await prisma.event.findMany({
      where: { createdAt: { gte: start } },
      select: { eventName: true, createdAt: true, userId: true }
    });

    const series = days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const eventsForDay = events.filter((event) => format(event.createdAt, "yyyy-MM-dd") === key);
      const activeUsers = new Set(eventsForDay.map((event) => event.userId).filter(Boolean));
      return {
        date: format(day, "MMM d"),
        events: eventsForDay.length,
        activeUsers: activeUsers.size,
        signups: eventsForDay.filter((event) => event.eventName === "user_signed_up").length,
        purchases: eventsForDay.filter((event) => event.eventName === "purchase_made").length
      };
    });

    return res.json({ series });
  })
);

router.get(
  "/top-events",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.event.groupBy({
      by: ["eventName"],
      _count: { eventName: true },
      orderBy: { _count: { eventName: "desc" } },
      take: 8
    });

    return res.json({
      events: grouped.map((item) => ({
        eventName: item.eventName,
        count: item._count.eventName
      }))
    });
  })
);

router.get(
  "/funnel",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const steps = ["user_signed_up", "workspace_created", "button_clicked", "purchase_made"];
    const counts = await Promise.all(
      steps.map((step) =>
        prisma.event.findMany({
          where: { eventName: step, userId: { not: null } },
          distinct: ["userId"],
          select: { userId: true }
        })
      )
    );

    const first = counts[0]?.length || 1;
    const funnel = steps.map((step, index) => ({
      step,
      users: counts[index].length,
      conversion: Math.round((counts[index].length / first) * 100)
    }));

    return res.json({ funnel });
  })
);

export default router;
