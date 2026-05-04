import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { writeAuditLog } from "../services/audit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT, AdminRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return res.json({ flags });
  })
);

const flagSchema = z.object({
  enabled: z.boolean().optional(),
  rollout: z.number().int().min(0).max(100).optional()
});

router.patch(
  "/:id",
  requireAuth,
  requireRoles(AdminRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const payload = flagSchema.parse(req.body);
    const flag = await prisma.featureFlag.update({
      where: { id: req.params.id },
      data: payload
    });

    await writeAuditLog({
      adminId: req.admin?.id,
      action: "FEATURE_FLAG_UPDATED",
      targetType: "FeatureFlag",
      targetId: flag.id,
      metadata: { key: flag.key, ...payload }
    });

    return res.json({ flag });
  })
);

export default router;
