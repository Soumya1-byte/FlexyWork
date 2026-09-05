import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDb } from "./config/db.js";
import { getClientOrigins, validateEnv } from "./config/env.js";
import { rateLimit } from "./middleware/rateLimit.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import communityRoutes from "./routes/communities.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payments.js";
import ratingRoutes from "./routes/ratings.js";
import shiftRoutes from "./routes/shifts.js";
import workerRoutes from "./routes/workers.js";

dotenv.config();
validateEnv();

const app = express();
const port = process.env.PORT || 4000;
const clientOrigins = getClientOrigins();

app.set("trust proxy", 1);

app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Auth rate limiting.
//
// The previous configuration put a single 30-req / 15-min bucket on the
// entire /api/auth router, which is too aggressive for a normal sign-up
// flow (send-otp + verify-otp + login easily uses 3-5 requests). We now
// use two layers:
//
//   1. A generous per-IP budget on all auth endpoints so legitimate
//      sign-ups, logins and OTP re-sends aren't blocked.
//   2. A much stricter per-IP budget on POST /api/auth/login specifically
//      so password-brute-force attempts are still rejected.
//
// NOTE on ordering: `app.use` middleware runs in registration order. We
// register the strict `/api/auth/login` limiter BEFORE the router so it
// actually sees the request (otherwise authRoutes would terminate the
// response first and the stricter limit would never apply).
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 200,
  keyPrefix: "auth"
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  keyPrefix: "login"
});

// Strict login limit runs after the broader /api/auth limiter so its
// response headers (the more restrictive ones) are the ones the client
// sees. Login is still rejected earlier because loginLimiter has the
// lower budget and runs before the auth router's handler.
app.use("/api/auth", authLimiter);

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((error, _req, res, _next) => {
  if (error?.name === "ZodError") {
    return res.status(400).json({ message: "Validation failed", issues: error.issues });
  }
  const status = error?.status || 500;
  res.status(status).json({ message: status === 500 ? "Something went wrong" : error?.message || "Something went wrong" });
});

import bcrypt from "bcryptjs";
import { User } from "./models/User.js";

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const existing = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (existing) return;

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.create({
    name: "FlexyWork Admin",
    email: adminEmail.toLowerCase().trim(),
    role: "admin",
    roles: ["admin"],
    passwordHash,
    location: "Indiranagar"
  });
  console.log(`Admin user created from .env: ${adminEmail}`);
}

connectDb()
  .then(async () => {
    await ensureAdminUser();
    app.listen(port, "0.0.0.0", () => {
      console.log(`FlexyWork API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error.message);
    process.exit(1);
  });
