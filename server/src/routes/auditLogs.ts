import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT),
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { admin: { select: { name: true, email: true, role: true } } }
    });

    return res.json({ logs });
  })
);

export default router;
