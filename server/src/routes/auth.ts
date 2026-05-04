import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { email: payload.email } });

    if (!admin || !(await bcrypt.compare(payload.password, admin.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const tokenPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: "8h" });
    return res.json({ token, admin: tokenPayload });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({ admin: req.admin });
  })
);

export default router;
