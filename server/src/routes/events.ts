import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const trackSchema = z.object({
  userId: z.string().optional(),
  eventName: z.string().min(2).max(80).regex(/^[a-z0-9_]+$/),
  properties: z.record(z.unknown()).optional().default({})
});

router.post(
  "/track",
  asyncHandler(async (req, res) => {
    const payload = trackSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        userId: payload.userId,
        eventName: payload.eventName,
        properties: payload.properties
      }
    });

    if (payload.userId) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { lastSeenAt: new Date() }
      }).catch(() => undefined);
    }

    return res.status(201).json({ event });
  })
);

router.get(
  "/",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.ANALYST),
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } }
    });

    return res.json({ events });
  })
);

export default router;
