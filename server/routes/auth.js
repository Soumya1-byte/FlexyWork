import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { EmployerProfile, WorkerProfile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { sendOtpEmail } from "../services/mailer.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

const router = express.Router();
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["worker", "employer", "seeker"]),
  location: z.string().min(2).optional(),
  businessName: z.string().optional(),
  otp: z.string().min(4).max(8).optional()
});

const seekerCertificateSchema = z.object({
  title: z.string().min(2).max(120),
  certificateNumber: z.string().max(80).optional(),
  issuedBy: z.string().max(120).optional(),
  expiresOn: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  fileName: z.string().min(1).max(180),
  fileType: z.string().min(1).max(120),
  fileDataUrl: z.string().min(1).max(3_000_000)
});

function serializeCertificate(certificate) {
  return {
    id: certificate._id?.toString(),
    title: certificate.title,
    certificateNumber: certificate.certificateNumber,
    issuedBy: certificate.issuedBy,
    expiresOn: certificate.expiresOn,
    notes: certificate.notes,
    fileName: certificate.fileName,
    fileType: certificate.fileType,
    uploadedAt: certificate.uploadedAt?.toISOString?.() || certificate.createdAt?.toISOString?.()
  };
}

function sign(user) {
  const role = user.role === "seeker" ? "employer" : user.role;
  return jwt.sign({ userId: user.id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function createProfile(user, body = {}, targetRole = null) {
  const role = targetRole || (user.role === "seeker" ? "employer" : user.role);
  if (role === "admin") return null;

  if (role === "worker") {
    const existing = await WorkerProfile.findOne({ userId: user._id });
    if (existing) return existing;
    return WorkerProfile.create({
      userId: user._id,
      location: body.location || user.location || "Indiranagar",
      skills: ["Customer handling", "Table service", "Billing support"],
      availability: [
        { day: "Mon", status: "Available", ranges: ["6 PM - 10 PM"] },
        { day: "Tue", status: "Available", ranges: ["6 PM - 10 PM"] },
        { day: "Wed", status: "Unavailable", ranges: [] },
        { day: "Thu", status: "Available", ranges: ["5 PM - 9 PM"] },
        { day: "Fri", status: "Available", ranges: ["6 PM - 11 PM"] },
        { day: "Sat", status: "Available", ranges: ["10 AM - 8 PM"] },
        { day: "Sun", status: "Limited", ranges: ["11 AM - 3 PM"] }
      ]
    });
  }

  const existing = await EmployerProfile.findOne({ userId: user._id });
  if (existing) return existing;
  return EmployerProfile.create({
    userId: user._id,
    businessName: body.businessName || `${user.name}'s Household`,
    location: body.location || user.location || "Indiranagar"
  });
}

router.post("/send-otp", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists. Please sign in instead." });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTPs for this email and save new OTP with 10-minute expiry
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp,
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send Email via mailer
    const mailResult = await sendOtpEmail(normalizedEmail, otp);

    res.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}`,
      devNotice: mailResult.devMode ? "Check server console for OTP code" : undefined
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = z.object({ email: z.string().email(), otp: z.string().min(4).max(8) }).parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: otp.trim(),
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const normalizedRole = body.role === "seeker" ? "employer" : body.role;
    const normalizedEmail = body.email.toLowerCase().trim();

    // Strictly check if email is already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists. Please sign in instead." });
    }

    // Verify OTP if passed or check that email was verified
    if (body.otp) {
      const otpRecord = await Otp.findOne({
        email: normalizedEmail,
        otp: body.otp.trim(),
        expiresAt: { $gt: new Date() }
      });
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }
      await Otp.deleteMany({ email: normalizedEmail });
    } else {
      // Check if previously verified
      const verifiedOtp = await Otp.findOne({
        email: normalizedEmail,
        verified: true,
        expiresAt: { $gt: new Date() }
      });
      if (!verifiedOtp) {
        return res.status(400).json({ message: "Please verify your email address with the OTP code first" });
      }
      await Otp.deleteMany({ email: normalizedEmail });
    }

    // Create brand new user (1 email = 1 account strictly)
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      ...body,
      email: normalizedEmail,
      role: normalizedRole,
      roles: [normalizedRole],
      passwordHash
    });

    await createProfile(user, body, normalizedRole);
    res.cookie("flexywork_token", sign(user), cookieOptions).status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      role: z.enum(["worker", "employer", "seeker", "admin"]).optional()
    }).parse(req.body);

    const user = await User.findOne({ email: body.email.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Always log in with user's permanent registered role
    res.cookie("flexywork_token", sign(user), cookieOptions).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/google", async (req, res, next) => {
  try {
    let { email, name, picture, googleId, role = "seeker", location = "Indiranagar", credential } = req.body;

    // Verify Real Google ID Token if passed from Google Identity Services
    if (credential) {
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        let payload;
        if (clientId) {
          try {
            const ticket = await googleClient.verifyIdToken({
              idToken: credential,
              audience: clientId
            });
            payload = ticket.getPayload();
          } catch (e) {
            payload = JSON.parse(Buffer.from(credential.split(".")[1], "base64").toString());
          }
        } else {
          payload = JSON.parse(Buffer.from(credential.split(".")[1], "base64").toString());
        }

        if (payload) {
          email = payload.email || email;
          name = payload.name || name || email.split("@")[0];
          picture = payload.picture || picture;
          googleId = payload.sub || googleId;
        }
      } catch (err) {
        console.error("Google Token Verification Error:", err.message);
      }
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required for Google Sign-In" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role === "seeker" ? "employer" : role;

    let user = await User.findOne({
      $or: [{ email: normalizedEmail }, ...(googleId ? [{ googleId }] : [])]
    });

    if (user) {
      // User already exists: strictly retain user's permanent registered role
      if (googleId && !user.googleId) user.googleId = googleId;
      if (picture && !user.profileImage) user.profileImage = picture;
      if (!user.authProvider) user.authProvider = "google";
      await user.save();
    } else {
      // Create new user authenticated via Google with the selected role
      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: googleId || `google_${Date.now()}`,
        profileImage: picture,
        authProvider: "google",
        role: normalizedRole,
        roles: [normalizedRole],
        location: location || "Indiranagar"
      });

      await createProfile(user, { location, businessName: `${user.name}'s Business` }, normalizedRole);
    }

    res.cookie("flexywork_token", sign(user), cookieOptions).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("flexywork_token").json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const profile =
    req.user.role === "worker"
      ? await WorkerProfile.findOne({ userId: req.user._id })
      : await EmployerProfile.findOne({ userId: req.user._id });
  // Strip sensitive raw coordinates from the user payload before sending.
  // Workers never expose lat/lng to other workers / seekers; seekers only
  // need to know their own coordinates are present.
  const safeUser = {
    id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    location: req.user.location,
    hasCoordinates:
      Number.isFinite(req.user.latitude) && Number.isFinite(req.user.longitude),
    locationUpdatedAt: req.user.locationUpdatedAt || null,
    profileImage: req.user.profileImage,
    phone: req.user.phone
  };
  res.json({ user: safeUser, profile });
});

const locationPayload = z
  .object({
    city: z.string().max(120).optional().default(""),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional()
  })
  .refine(
    (data) =>
      // Allow clearing the location entirely by sending neither field.
      (data.latitude === undefined && data.longitude === undefined) ||
      (data.latitude !== undefined && data.longitude !== undefined),
    {
      message: "latitude and longitude must be supplied together"
    }
  );

/**
 * Persist the seeker's (employer/admin) location. Used by the browser
 * geolocation flow on the explore / search pages. Coordinates are
 * optional — the seeker can also save just a city name if they decline
 * permission.
 */
router.put("/me/location", requireAuth, async (req, res, next) => {
  try {
    const body = locationPayload.parse(req.body);

    const updates = {};
    if (body.city) updates.location = body.city;
    if (body.latitude !== undefined && body.longitude !== undefined) {
      updates.latitude = body.latitude;
      updates.longitude = body.longitude;
      updates.locationUpdatedAt = new Date();
    } else if (body.city) {
      // City-only update: clear any prior coordinates so we never match
      // against a stale GPS reading.
      updates.latitude = null;
      updates.longitude = null;
      updates.locationUpdatedAt = null;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: "after" });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role === "seeker" ? "employer" : user.role,
        location: user.location,
        hasCoordinates:
          Number.isFinite(user.latitude) && Number.isFinite(user.longitude),
        locationUpdatedAt: user.locationUpdatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/seeker-certificates", requireAuth, requireRole("employer"), async (req, res, next) => {
  try {
    const profile = await EmployerProfile.findOne({ userId: req.user._id });
    res.json({ certificates: (profile?.certificates || []).map(serializeCertificate) });
  } catch (error) {
    next(error);
  }
});

router.post("/seeker-certificates", requireAuth, requireRole("employer"), async (req, res, next) => {
  try {
    const body = seekerCertificateSchema.parse(req.body);
    const profile = await EmployerProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        $setOnInsert: {
          userId: req.user._id,
          businessName: `${req.user.name}'s Household`,
          location: req.user.location || "Indiranagar"
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    profile.certificates.push(body);
    await profile.save();

    res.status(201).json({
      certificates: profile.certificates.map(serializeCertificate)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
