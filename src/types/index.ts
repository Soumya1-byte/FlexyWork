export type UserRole = 'seeker' | 'worker' | 'employer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  location?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AvailabilitySlot {
  day: string;
  status: 'Available' | 'Unavailable' | 'Limited';
  ranges: string[];
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type WorkerVerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface Certification {
  id: string;
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  description?: string;
  documentUrl?: string;
  documentFileName?: string;
  documentFileType?: string;
  documentDataUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  rejectionReason?: string;
}

export interface WorkExperience {
  id: string;
  jobTitle: string;
  organization: string;
  startDate: string;
  endDate?: string;
  currentlyWorking: boolean;
  description?: string;
  skills: string[];
}

export interface WorkerProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  bio: string;
  location: string;
  distance?: number | null; // In kilometres (calculated relative to viewer)
  hasCoordinates?: boolean;
  rating: number;
  completedGigsCount: number;
  reliabilityScore: number; // Percentage (e.g. 98)
  responseTime?: string; // e.g. "Fast Responder", "Within 1 hour"
  hourlyRate: number; // in ₹
  availability: AvailabilitySlot[];
  isVerified: boolean;
  workerVerificationStatus?: WorkerVerificationStatus;
  isTopRated: boolean;
  communityId?: string;
  communityName?: string;
  avatarUrl?: string;
  certifications?: Certification[];
  workExperiences?: WorkExperience[];
  /** Internal — used by the worker location edit form only. Never rendered publicly. */
  latitude?: number | null;
  longitude?: number | null;
}

export interface WorkerVerificationStatusResponse {
  workerVerificationStatus: WorkerVerificationStatus;
  isVerified: boolean;
  certifications: Certification[];
  latestRejectionReason?: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  businessName: string;
  location: string;
  avatarUrl?: string;
}

export type GigStatus = 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'published' | 'filled' | 'in_progress' | 'completed' | 'cancelled';

export interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  workersRequired: number;
  filledCount: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  time: string; // formatted e.g. "10:00 AM - 2:00 PM"
  duration: string; // e.g. "4h"
  paymentType: 'fixed' | 'hourly';
  paymentAmount: number; // in ₹
  location: string;
  maximumDistance?: number;
  serviceMode?: 'scheduled' | 'emergency' | 'on_demand';
  customerType?: 'household' | 'institution' | 'cooperative';
  certificationRequired?: boolean;
  certificateRequirementDetails?: string;
  certificateName?: string;
  certificateType?: string;
  certificateDataUrl?: string;
  hasCertificateUpload?: boolean;
  insuranceIncluded?: boolean;
  welfareContribution?: number;
  invoiceRequired?: boolean;
  emergencyContact?: string;
  urgency: 'normal' | 'urgent';
  status: GigStatus;
  employerId: string;
  employerName: string;
  assignedWorkerIds: string[];
  applicationStatus?: 'pending' | 'accepted' | 'declined' | 'rejected' | null;
  matchScore?: number; // Match rating percentage (e.g. 95)
  matchReasons?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  checkInOtp?: string;
  paymentStatus?: 'none' | 'awaiting' | 'paid' | 'failed';
}

export interface ShiftApplication {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  worker: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    location?: string;
  };
  profile?: WorkerProfile | null;
}

export interface Booking {
  id: string;
  gigId: string;
  title: string;
  category: string;
  workerId: string;
  workerName: string;
  workerAvatar?: string;
  date: string;
  time: string;
  price: number;
  status: GigStatus;
  location: string;
  description: string;
}

export interface Community {
  id: string;
  name: string;
  memberCount: number;
  rating: number;
  services: string[];
  totalEarnings: number;
  bannerImage: string;
  logo: string;
  description: string;
  activityFeed: {
    id: string;
    text: string;
    timestamp: string;
  }[];
}

export interface CooperativeGig {
  id: string;
  communityId: string;
  title: string;
  description: string;
  totalPayout: number;
  workersRequired: number;
  joinedWorkers: {
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  }[];
  skillsRequired: {
    skill: string;
    count: number;
    filled: number;
  }[];
  status: 'open' | 'filled' | 'in_progress' | 'completed';
  distribution: string; // description of payout distribution
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'gig' | 'system' | 'community';
  actionUrl?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  amount: number;
  type: 'earnings' | 'coop_payout' | 'platform_fee';
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  gateway?: 'razorpay' | 'manual' | string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}
