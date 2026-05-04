import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import analyticsRouter from "./routes/analytics.js";
import auditLogsRouter from "./routes/auditLogs.js";
import authRouter from "./routes/auth.js";
import eventsRouter from "./routes/events.js";
import featureFlagsRouter from "./routes/featureFlags.js";
import usersRouter from "./routes/users.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "admin-analytics-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/events", eventsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/audit-logs", auditLogsRouter);
app.use("/api/feature-flags", featureFlagsRouter);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
