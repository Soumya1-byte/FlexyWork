import express from "express";
import { z } from "zod";
import { requireAuth, requireRole, computeWorkerVerificationStatus } from "../middleware/auth.js";
import { WorkerProfile } from "../models/Profile.js";
import { Shift } from "../models/Shift.js";
import { User } from "../models/User.js";

const router = express.Router();

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    avatarUrl: user.profileImage,
    createdAt: user.createdAt?.toISOString()
  };
}

function serializeCertification(cert) {
  if (!cert) return null;
  return {
    id: cert._id.toString(),
    title: cert.title,
    issuingOrganization: cert.issuingOrganization,
    issueDate: cert.issueDate || "",
    expiryDate: cert.expiryDate || "",
    credentialId: cert.credentialId || "",
    description: cert.description || "",
    documentUrl: cert.documentUrl || "",
    documentFileName: cert.documentFileName || "",
    documentFileType: cert.documentFileType || "",
    documentDataUrl: cert.documentDataUrl || "",
    verificationStatus: cert.verificationStatus || "pending",
    verifiedAt: cert.verifiedAt ? cert.verifiedAt.toISOString() : null,
    rejectionReason: cert.rejectionReason || ""
  };
}

function serializeExperience(exp) {
  if (!exp) return null;
  return {
    id: exp._id.toString(),
    jobTitle: exp.jobTitle,
    organization: exp.organization,
    startDate: exp.startDate || "",
    endDate: exp.endDate || "",
    currentlyWorking: !!exp.currentlyWorking,
    description: exp.description || "",
    skills: exp.skills || []
  };
}

function serializeWorker(profile, user) {
  const status = computeWorkerVerificationStatus(profile);
  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    name: user?.name || "FlexyWork Provider",
    email: user?.email || "",
    skills: profile.skills || [],
    bio: profile.bio || profile.experience || "Reliable local service provider.",
    location: profile.location || user?.location || "Vijayawada",
    // Admin sees the general city/area label only — exact coordinates
    // are intentionally withheld from the admin UI as well to honour the
    // privacy contract.
    distance: null,
    rating: profile.rating || 4.8,
    completedGigsCount: profile.completedShifts || 0,
    reliabilityScore: profile.reliabilityScore || 94,
    responseTime: "Within 1 hour",
    hourlyRate: profile.expectedHourlyWage || 200,
    availability: profile.availability || [],
    isVerified: status === "approved",
    workerVerificationStatus: status,
    isTopRated: (profile.rating || 0) >= 4.8,
    avatarUrl: user?.profileImage,
    certifications: (profile.certifications || []).map(serializeCertification).filter(Boolean),
    workExperiences: (profile.workExperiences || []).map(serializeExperience).filter(Boolean)
  };
}

function serializeShift(shift, employer) {
  const statusMap = {
    draft: "REQUESTED",
    published: "REQUESTED",
    filled: "ACCEPTED",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "DECLINED"
  };

  return {
    id: shift._id.toString(),
    title: shift.title,
    description: shift.description,
    category: shift.category,
    requiredSkills: shift.requiredSkills,
    workersRequired: shift.workersRequired,
    filledCount: shift.assignedWorkerIds.length,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    time: `${shift.startTime} - ${shift.endTime}`,
    duration: shift.duration,
    paymentType: shift.paymentType,
    paymentAmount: shift.paymentAmount,
    location: shift.location,
    maximumDistance: shift.maximumDistance,
    serviceMode: shift.serviceMode,
    customerType: shift.customerType,
    certificationRequired: shift.certificationRequired,
    certificateRequirementDetails: shift.certificateRequirementDetails,
    certificateName: shift.certificateName,
    certificateType: shift.certificateType,
    hasCertificateUpload: Boolean(shift.certificateDataUrl),
    insuranceIncluded: shift.insuranceIncluded,
    welfareContribution: shift.welfareContribution,
    invoiceRequired: shift.invoiceRequired,
    emergencyContact: shift.emergencyContact,
    urgency: shift.urgency,
    status: statusMap[shift.status] || "REQUESTED",
    employerId: shift.employerId.toString(),
    employerName: employer?.name || "Local employer",
    assignedWorkerIds: shift.assignedWorkerIds.map((id) => id.toString())
  };
}

router.get("/dashboard", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const [users, profiles, shifts] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(100),
      WorkerProfile.find().sort({ rating: -1, reliabilityScore: -1 }).limit(100),
      Shift.find().sort({ createdAt: -1 }).limit(100)
    ]);

    const userIds = [...profiles.map((profile) => profile.userId), ...shifts.map((shift) => shift.employerId)];
    const relatedUsers = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(relatedUsers.map((user) => [user._id.toString(), user]));

    res.json({
      users: users.map(serializeUser),
      workers: profiles.map((profile) => serializeWorker(profile, usersById.get(profile.userId.toString()))),
      shifts: shifts.map((shift) => serializeShift(shift, usersById.get(shift.employerId.toString())))
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/workers/:id/verification", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const profile = await WorkerProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: "Worker profile not found" });

    profile.isVerified = !(profile.isVerified ?? true);
    await profile.save();

    const user = await User.findById(profile.userId);
    res.json({ worker: serializeWorker(profile, user) });
  } catch (error) {
    next(error);
  }
});

const verifyCertPayload = z.object({
  verificationStatus: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().max(500).optional().default("")
});

router.patch(
  "/workers/:workerId/certifications/:certId/verification",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { workerId, certId } = req.params;
      if (!objectIdPattern.test(workerId) || !objectIdPattern.test(certId)) {
        return res.status(404).json({ message: "Certification not found" });
      }

      const body = verifyCertPayload.parse(req.body);
      const profile = await WorkerProfile.findById(workerId);
      if (!profile) return res.status(404).json({ message: "Worker profile not found" });

      const cert = profile.certifications.id(certId);
      if (!cert) return res.status(404).json({ message: "Certification not found" });

      cert.verificationStatus = body.verificationStatus;
      cert.verifiedAt = body.verificationStatus === "verified" ? new Date() : null;
      cert.verifiedBy = body.verificationStatus === "verified" ? req.user._id : null;
      cert.rejectionReason = body.verificationStatus === "rejected" ? (body.rejectionReason || "") : "";

      // Re-sync the worker's overall isVerified flag from the cert array.
      const status = computeWorkerVerificationStatus(profile);
      profile.isVerified = status === "approved";

      await profile.save();
      res.json({
        certification: serializeCertification(cert),
        workerVerificationStatus: status,
        workerId: profile._id.toString()
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/worker-verifications", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const profiles = await WorkerProfile.find().sort({ updatedAt: -1 });
    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    const verifications = profiles.map((profile) => {
      const user = usersById.get(profile.userId.toString());
      const certs = (profile.certifications || []).map(serializeCertification).filter(Boolean);
      const status = computeWorkerVerificationStatus(profile);
      const latestCert = certs.length ? certs[certs.length - 1] : null;
      return {
        workerId: profile._id.toString(),
        userId: profile.userId.toString(),
        name: user?.name || "Worker",
        email: user?.email || "",
        location: profile.location || user?.location || "",
        skills: profile.skills || [],
        avatarUrl: user?.profileImage,
        workerVerificationStatus: status,
        isVerified: status === "approved",
        certificates: certs,
        submittedAt: profile.updatedAt?.toISOString() || profile.createdAt?.toISOString() || null,
        latestCertificate: latestCert
      };
    });

    res.json({ verifications });
  } catch (error) {
    next(error);
  }
});

router.get("/certifications", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const profiles = await WorkerProfile.find({ "certifications.0": { $exists: true } });
    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    const result = [];
    profiles.forEach((profile) => {
      const user = usersById.get(profile.userId.toString());
      (profile.certifications || []).forEach((cert) => {
        result.push({
          workerId: profile._id.toString(),
          workerName: user?.name || "Worker",
          workerEmail: user?.email || "",
          certification: serializeCertification(cert)
        });
      });
    });
    res.json({ certifications: result });
  } catch (error) {
    next(error);
  }
});

export default router;
