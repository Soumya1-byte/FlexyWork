import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    status: { type: String, enum: ["Available", "Unavailable", "Limited"], default: "Unavailable" },
    ranges: [{ type: String }]
  },
  { _id: false }
);

const dateOverrideSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    status: { type: String, enum: ["Available", "Unavailable", "Limited"], default: "Unavailable" },
    ranges: [{ type: String }]
  },
  { _id: false }
);

const unavailablePeriodSchema = new mongoose.Schema(
  {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: String
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    issuingOrganization: { type: String, required: true, trim: true },
    issueDate: { type: String, required: true },
    expiryDate: { type: String, default: "" },
    credentialId: { type: String, default: "" },
    description: { type: String, default: "" },
    documentUrl: { type: String, default: "" },
    documentFileName: { type: String, default: "" },
    documentFileType: { type: String, default: "" },
    documentDataUrl: { type: String, default: "" },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending"
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" }
  },
  { _id: true, timestamps: true }
);

const experienceSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String, default: "" },
    currentlyWorking: { type: Boolean, default: false },
    description: { type: String, default: "" },
    skills: [{ type: String }]
  },
  { _id: true, timestamps: true }
);

const workerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    skills: [{ type: String }],
    experience: { type: String, default: "Local shift work" },
    bio: String,
    expectedHourlyWage: { type: Number, default: 125 },
    availability: [availabilitySchema],
    dateOverrides: [dateOverrideSchema],
    unavailablePeriods: [unavailablePeriodSchema],
    rating: { type: Number, default: 4.8 },
    reliabilityScore: { type: Number, default: 94 },
    completedShifts: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    location: { type: String, default: "Indiranagar" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationUpdatedAt: { type: Date, default: null },
    certifications: [certificationSchema],
    workExperiences: [experienceSchema]
  },
  { timestamps: true }
);

// Compound geo index used by the worker-search bounding-box pre-filter
workerProfileSchema.index({ latitude: 1, longitude: 1 });

const seekerCertificateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    certificateNumber: { type: String, default: "" },
    issuedBy: { type: String, default: "" },
    expiresOn: { type: String, default: "" },
    notes: { type: String, default: "" },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileDataUrl: { type: String, default: "" }
  },
  { _id: true, timestamps: true }
);

const employerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true },
    businessType: { type: String, default: "Local business" },
    description: String,
    location: { type: String, default: "Indiranagar" },
    verificationStatus: { type: String, enum: ["pending", "verified"], default: "verified" },
    rating: { type: Number, default: 4.7 },
    certificates: [seekerCertificateSchema]
  },
  { timestamps: true }
);

export const WorkerProfile = mongoose.model("WorkerProfile", workerProfileSchema);
export const EmployerProfile = mongoose.model("EmployerProfile", employerProfileSchema);
