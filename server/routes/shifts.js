import express from "express";
import { z } from "zod";
import { requireAuth, requireRole, optionalAuth, requireVerifiedWorker } from "../middleware/auth.js";
import { Application } from "../models/Application.js";
import { Attendance } from "../models/Attendance.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { EmployerProfile, WorkerProfile } from "../models/Profile.js";
import { Shift } from "../models/Shift.js";
import { User } from "../models/User.js";
import { calculateMatch } from "../services/matching.js";
import {
  parseShiftFromNaturalLanguage,
  enhanceShiftDescription,
  getCategoryWageBenchmarks
} from "../services/aiShiftParser.js";

const router = express.Router();

const shiftSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(8),
  category: z.string().min(2),
  requiredSkills: z.array(z.string()).default([]),
  workersRequired: z.coerce.number().int().min(1).default(1),
  date: z.string().min(4),
  startTime: z.string().min(2),
  endTime: z.string().min(2),
  duration: z.string().min(1).optional().default("4h"),
  paymentType: z.enum(["fixed", "hourly"]).default("fixed"),
  paymentAmount: z.coerce.number().min(1),
  location: z.string().min(2),
  maximumDistance: z.coerce.number().min(1).default(8),
  urgency: z.enum(["normal", "urgent"]).default("normal")
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function serializeShift(shift, workerProfile, viewerId) {
  const employer = await User.findById(shift.employerId);
  const employerProfile = await EmployerProfile.findOne({ userId: shift.employerId });
  const application = viewerId ? await Application.findOne({ shiftId: shift._id, workerId: viewerId }) : null;
  const match = workerProfile ? calculateMatch(shift, workerProfile) : null;

  // Retrieve attendance record for accurate check-in / check-out timestamps
  let attendance = null;
  if (viewerId) {
    attendance = await Attendance.findOne({ shiftId: shift._id, workerId: viewerId });
  }
  if (!attendance && shift.assignedWorkerIds?.length > 0) {
    attendance = await Attendance.findOne({ shiftId: shift._id, workerId: { $in: shift.assignedWorkerIds } });
  }
  if (!attendance) {
    attendance = await Attendance.findOne({
      shiftId: shift._id,
      checkInAt: { $exists: true, $ne: null }
    }).sort({ checkInAt: -1 });
  }

  const assignedWorkerIds = (shift.assignedWorkerIds || []).map((id) => id.toString());
  const hash = shift._id.toString();
  const num = Math.abs(hash.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7)) % 9000 + 1000;
  const checkInOtp = shift.checkInOtp || String(num);

  let paymentStatus = "none";
  if (attendance?.checkInAt) {
    const paymentQuery = { shiftId: shift._id };
    if (viewerId && workerProfile) {
      paymentQuery.workerId = viewerId;
    }
    const payment = await Payment.findOne(paymentQuery).sort({ updatedAt: -1 });
    if (payment?.status === "marked_paid") paymentStatus = "paid";
    else if (payment?.status === "failed") paymentStatus = "failed";
    else paymentStatus = "awaiting";
  }

  return {
    id: shift._id.toString(),
    title: shift.title,
    description: shift.description,
    category: shift.category,
    requiredSkills: shift.requiredSkills || [],
    workersRequired: shift.workersRequired || 1,
    filledCount: assignedWorkerIds.length,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    duration: shift.duration,
    paymentType: shift.paymentType,
    paymentAmount: shift.paymentAmount,
    location: shift.location,
    maximumDistance: shift.maximumDistance,
    urgency: shift.urgency,
    status: shift.status,
    employerId: shift.employerId?.toString() || "",
    employerName: employerProfile?.businessName || employer?.name || "Local Resident",
    assignedWorkerIds,
    applicationStatus: application ? application.status : null,
    matchScore: match ? match.score : 85,
    matchReasons: match ? match.reasons : ["Flexible shift in your area"],
    time: `${shift.startTime} - ${shift.endTime}`,
    checkInTime: attendance?.checkInAt ? new Date(attendance.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    checkOutTime: attendance?.checkOutAt ? new Date(attendance.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    checkInOtp: viewerId && shift.employerId?.toString() === viewerId?.toString() ? checkInOtp : undefined,
    paymentStatus
  };
}

const shiftQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  date: z.string().max(10).optional(),
  minPay: z.coerce.number().min(0).optional()
});

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const parsed = shiftQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid query parameters" });
    const { search, category, date, minPay } = parsed.data;

    const query = { status: "published" };
    if (category) query.category = category;
    if (date) query.date = date;
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ title: regex }, { description: regex }, { category: regex }, { location: regex }];
    }
    if (minPay !== undefined) query.paymentAmount = { $gte: minPay };

    const viewerId = req.user?._id;
    const workerProfile = req.user?.role === "worker" ? await WorkerProfile.findOne({ userId: req.user._id }) : null;
    const shifts = await Shift.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ shifts: await Promise.all(shifts.map((shift) => serializeShift(shift, workerProfile, viewerId))) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireRole("employer"), async (req, res, next) => {
  try {
    const body = shiftSchema.parse(req.body);
    const employerId = req.user._id;
    const shift = await Shift.create({ ...body, employerId, status: "published" });
    res.status(201).json({ shift: await serializeShift(shift) });
  } catch (error) {
    next(error);
  }
});

const parsePayloadSchema = z.object({
  rawText: z.string().min(1).max(5000).optional(),
  prompt: z.string().min(1).max(5000).optional()
}).refine((data) => (data.rawText && data.rawText.trim().length > 0) || (data.prompt && data.prompt.trim().length > 0), {
  message: "rawText or prompt is required"
});

router.post("/parse", optionalAuth, async (req, res, next) => {
  try {
    const parsedBody = parsePayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Please provide a valid shift description in rawText." });
    }

    const rawText = (parsedBody.data.rawText || parsedBody.data.prompt || "").trim();
    if (!rawText) {
      return res.status(400).json({ message: "rawText must be a non-empty string." });
    }

    const { parsedShift, needsClarification } = await parseShiftFromNaturalLanguage(rawText);

    res.json({
      parsedShift,
      needsClarification,
      parsed: parsedShift
    });
  } catch (error) {
    console.error("Shift parse error:", error);
    res.status(500).json({ message: "AI shift parsing failed. You can still fill the form manually." });
  }
});

router.post("/enhance-description", optionalAuth, async (req, res, next) => {
  try {
    const { title, category, location, skills, description } = req.body;
    const enhanced = await enhanceShiftDescription({ title, category, location, skills, description });
    res.json({ enhancedDescription: enhanced });
  } catch (error) {
    console.error("Enhance description error:", error);
    res.status(500).json({ message: "Failed to enhance description." });
  }
});

router.get("/wage-benchmarks", (_req, res) => {
  res.json({ benchmarks: getCategoryWageBenchmarks() });
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "employer") {
      const shifts = await Shift.find({ employerId: req.user._id }).sort({ createdAt: -1 });
      return res.json({ shifts: await Promise.all(shifts.map((shift) => serializeShift(shift, null, req.user._id))) });
    }

    const applications = await Application.find({ workerId: req.user._id });
    const appliedShiftIds = applications.map((a) => a.shiftId);
    const shifts = await Shift.find({
      $or: [{ _id: { $in: appliedShiftIds } }, { assignedWorkerIds: req.user._id }]
    }).sort({ createdAt: -1 });

    const workerProfile = await WorkerProfile.findOne({ userId: req.user._id });
    const serialized = await Promise.all(shifts.map((shift) => serializeShift(shift, workerProfile, req.user._id)));
    res.json({ shifts: serialized });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    const application = await Application.findOne({ shiftId: shift._id, workerId: req.user._id });
    const canView =
      shift.status === "published" ||
      shift.employerId.equals(req.user._id) ||
      shift.assignedWorkerIds.some((id) => id.equals(req.user._id)) ||
      Boolean(application);
    if (!canView) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const workerProfile = req.user.role === "worker" ? await WorkerProfile.findOne({ userId: req.user._id }) : null;
    res.json({ shift: await serializeShift(shift, workerProfile, req.user._id) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/apply", requireAuth, requireRole("worker"), requireVerifiedWorker, async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (shift.status !== "published") return res.status(409).json({ message: "Shift is not open" });
    if (shift.assignedWorkerIds.length >= shift.workersRequired) return res.status(409).json({ message: "Shift is already full" });

    const application = await Application.create({ shiftId: shift._id, workerId: req.user._id });
    await Notification.create({ userId: shift.employerId, message: `${req.user.name} applied for ${shift.title}` });
    res.status(201).json({ application, message: "Application submitted" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You already applied for this shift" });
    next(error);
  }
});

router.post("/:id/accept", requireAuth, requireRole("worker"), requireVerifiedWorker, async (req, res, next) => {
  try {
    let shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (shift.status !== "published") return res.status(409).json({ message: "Shift is not open" });
    if (shift.assignedWorkerIds.some((id) => id.equals(req.user._id))) {
      return res.status(409).json({ message: "You are already assigned to this shift" });
    }

    shift = await Shift.findOneAndUpdate(
      {
        _id: shift._id,
        status: "published",
        assignedWorkerIds: { $ne: req.user._id },
        $expr: { $lt: [{ $size: "$assignedWorkerIds" }, "$workersRequired"] }
      },
      { $push: { assignedWorkerIds: req.user._id } },
      { returnDocument: "after" }
    );

    if (!shift) return res.status(409).json({ message: "Shift is already full" });

    await Application.findOneAndUpdate(
      { shiftId: shift._id, workerId: req.user._id },
      { status: "accepted", acceptedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    if (shift.assignedWorkerIds.length >= shift.workersRequired) {
      shift = await Shift.findByIdAndUpdate(shift._id, { status: "filled" }, { returnDocument: "after" });
    }

    await Attendance.updateOne(
      { shiftId: shift._id, workerId: req.user._id },
      { $setOnInsert: { status: "scheduled" } },
      { upsert: true }
    );
    await Notification.create({ userId: shift.employerId, message: `${req.user.name} accepted ${shift.title}` });

    const workerProfile = await WorkerProfile.findOne({ userId: req.user._id });
    res.json({ shift: await serializeShift(shift, workerProfile, req.user._id) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/applications", requireAuth, requireRole("employer"), async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (!shift.employerId.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const applications = await Application.find({ shiftId: shift._id }).populate("workerId").sort({ createdAt: -1 });
    res.json({
      applications: await Promise.all(
        applications.map(async (application) => {
          const profile = await WorkerProfile.findOne({ userId: application.workerId._id });
          return {
            id: application._id.toString(),
            status: application.status,
            appliedAt: application.appliedAt,
            worker: application.workerId,
            profile
          };
        })
      )
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/applications/:applicationId", requireAuth, requireRole("employer"), async (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(["accepted", "rejected"]) }).parse(req.body);
    const application = await Application.findById(req.params.applicationId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    let shift = await Shift.findById(application.shiftId);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (!shift.employerId.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    if (body.status === "rejected") {
      application.status = "rejected";
      application.rejectedAt = new Date();
      await application.save();
      return res.json({ application, shift: await serializeShift(shift) });
    }

    const alreadyAssigned = shift.assignedWorkerIds.some((id) => id.equals(application.workerId));
    if (!alreadyAssigned) {
      shift = await Shift.findOneAndUpdate(
        {
          _id: shift._id,
          employerId: req.user._id,
          assignedWorkerIds: { $ne: application.workerId },
          $expr: { $lt: [{ $size: "$assignedWorkerIds" }, "$workersRequired"] }
        },
        { $push: { assignedWorkerIds: application.workerId } },
        { returnDocument: "after" }
      );

      if (!shift) return res.status(409).json({ message: "Shift is already full" });
    }

    application.status = "accepted";
    application.acceptedAt = new Date();
    if (shift.assignedWorkerIds.length >= shift.workersRequired) {
      shift.status = "filled";
      await shift.save();
    }

    await application.save();
    await Attendance.updateOne(
      { shiftId: shift._id, workerId: application.workerId },
      { $setOnInsert: { status: "scheduled" } },
      { upsert: true }
    );
    await Notification.create({ userId: application.workerId, message: `You were accepted for ${shift.title}` });

    res.json({ application, shift: await serializeShift(shift) });
  } catch (error) {
    next(error);
  }
});

export default router;
