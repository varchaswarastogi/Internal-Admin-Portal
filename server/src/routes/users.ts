import { AdminRole, UserStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { writeAuditLog } from "../services/audit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const listSchema = z.object({
  search: z.string().optional().default(""),
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: z.enum(["createdAt", "lastSeenAt", "name", "email", "plan", "status"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10)
});

router.get(
  "/",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT, AdminRole.ANALYST),
  asyncHandler(async (req, res) => {
    const query = listSchema.parse(req.query);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
              { country: { contains: query.search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      users,
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        pages: Math.ceil(total / query.pageSize)
      }
    });
  })
);

router.get(
  "/:id/activity",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT, AdminRole.ANALYST),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const events = await prisma.event.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return res.json({ user, events });
  })
);

const statusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().min(3).max(240).optional()
});

router.patch(
  "/:id/status",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT),
  asyncHandler(async (req, res) => {
    const payload = statusSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: payload.status }
    });

    await writeAuditLog({
      adminId: req.admin?.id,
      action: `USER_${payload.status}`,
      targetType: "User",
      targetId: user.id,
      metadata: { reason: payload.reason, email: user.email }
    });

    return res.json({ user });
  })
);

export default router;
