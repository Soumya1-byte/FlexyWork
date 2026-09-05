'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Clock, MapPin, IndianRupee, 
  Play, CheckCircle, Navigation, Radio, CheckSquare, Square,
  Hourglass, CheckCircle2, XCircle, ArrowRight, ShieldCheck, Sparkles,
  KeyRound, AlertCircle, FileText
} from 'lucide-react';
import { Gig, User } from '../../../../types';
import { getGigById, recordAttendance, applyForGig, getRequiredCertificate } from '../../../../services/gigs';
import { getMe } from '../../../../services/auth';
import StatusBadge from '../../../../components/ui/StatusBadge';

export default function WorkerGigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ id: number; text: string; done: boolean }[]>([
    { id: 1, text: 'Confirm location GPS matches check-in radius', done: false },
    { id: 2, text: 'Perform primary scope requirements', done: false },
    { id: 3, text: 'Review quality standards with client', done: false },
    { id: 4, text: 'Secure final feedback signatures', done: false }
  ]);

  const gigId = params.id as string;

  const fetchGig = async () => {
    setLoading(true);
    const [user, data] = await Promise.all([
      getMe(),
      getGigById(gigId)
    ]);
    setCurrentUser(user);
    setGig(data);
    setLoading(false);
  };

  useEffect(() => {
    if (gigId) {
      fetchGig();
      const interval = setInterval(fetchGig, 15000);
      return () => clearInterval(interval);
    }
  }, [gigId]);

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleApply = async () => {
    if (!gig) return;
    setActionLoading(true);
    try {
      await applyForGig(gig.id);
      await fetchGig();
    } catch (err: any) {
      alert(err.message || 'Could not submit application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: 'check-in' | 'check-out', otp?: string) => {
    if (!gig) return;
    setActionLoading(true);
    setOtpError(null);
    try {
      await recordAttendance(gig.id, action, otp);
      setOtpInput('');
      await fetchGig();
    } catch (e: any) {
      setOtpError(e.message || 'Failed to update attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCertificateCheck = async () => {
    if (!gig) return;
    const certificate = await getRequiredCertificate(gig.id);
    if (!certificate?.dataUrl) {
      alert('No certificate file is uploaded for this gig.');
      return;
    }

    const link = document.createElement('a');
    link.href = certificate.dataUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = certificate.name || 'required-certificate';
    link.click();
  };

  if (loading && !gig) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center animate-pulse">
        <div className="h-6 w-48 bg-stone-200 rounded mx-auto mb-2" />
        <div className="h-24 bg-stone-100 rounded-2xl" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-ink">Gig Details Not Found</h2>
        <Link href="/worker/gigs" className="inline-block rounded-xl bg-brand-500 text-white px-4 py-2 text-xs font-bold">
          Return to Gigs
        </Link>
      </div>
    );
  }

  const isAssigned = gig.assignedWorkerIds?.includes(currentUser?.id || '') || 
                     gig.applicationStatus === 'accepted' ||
                     ['filled', 'in_progress', 'completed', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(gig.status);

  const isPending = gig.applicationStatus === 'pending' && !isAssigned;
  const isRejected = gig.applicationStatus === 'rejected';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 page-enter pb-24 lg:pb-8">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-surface-border pb-4">
        <Link href="/worker/gigs" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={14} /> Back to available shifts
        </Link>
        <StatusBadge status={gig.status} />
      </div>

      {/* 2-Column Marketplace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Shift Information (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header & Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xxs font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded uppercase tracking-wider">
                {gig.category}
              </span>
              {gig.urgency === 'urgent' && (
                <span className="text-xxs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded uppercase tracking-wider">
                  Urgent Shift
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              {gig.title}
            </h1>
            <p className="text-xs text-ink-muted font-medium">
              Posted by <span className="font-bold text-ink">{gig.employerName || 'Corner Store Retail'}</span> · Indiranagar
            </p>
          </div>

          {/* Key Shift Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border border-surface-border rounded-xl p-4 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-xxs font-medium text-ink-subtle uppercase">Schedule</span>
              <p className="text-xs font-bold text-ink flex items-center gap-1">
                <Clock size={12} className="text-brand-600 shrink-0" />
                {gig.time || `${gig.startTime || '6:00 PM'} – ${gig.endTime || '10:00 PM'}`}
              </p>
              <span className="text-xxs text-ink-subtle block">{gig.duration || '4 hrs'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-xxs font-medium text-ink-subtle uppercase">Date</span>
              <p className="text-xs font-bold text-ink flex items-center gap-1">
                <Calendar size={12} className="text-brand-600 shrink-0" />
                {gig.date || 'Today'}
              </p>
              <span className="text-xxs text-ink-subtle block">Flexible Shift</span>
            </div>
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-xxs font-medium text-ink-subtle uppercase">Location</span>
              <p className="text-xs font-bold text-ink flex items-center gap-1 truncate">
                <MapPin size={12} className="text-stone-400 shrink-0" />
                {gig.location || 'Indiranagar, Bangalore'}
              </p>
              <span className="text-xxs text-emerald-600 font-semibold block">1.2 km away</span>
            </div>
          </div>

          {/* Detailed Duties & Scope */}
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              About the Shift & Responsibilities
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-line">
              {gig.description || 'Provide flexible assistance during the shift as detailed by the store manager. Ensure cleanliness, friendly customer service, and timely completion of duties.'}
            </p>
          </div>

          {/* Required Skills */}
          {gig.requiredSkills && gig.requiredSkills.length > 0 && (
            <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Required Skills & Qualifications
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {gig.requiredSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-800 bg-brand-50 border border-brand-200/60 px-2.5 py-1 rounded-lg"
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(gig.certificationRequired || gig.certificateRequirementDetails || gig.hasCertificateUpload) && (
            <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Required Certificate Check
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                    {gig.certificateRequirementDetails || 'The seeker requires a verified or certified worker for this service.'}
                  </p>
                </div>
                <FileText size={18} className="shrink-0 text-violet-600" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                {gig.certificationRequired && (
                  <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-brand-700">Certification required</span>
                )}
                {gig.certificateName && (
                  <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700">{gig.certificateName}</span>
                )}
              </div>
              {gig.hasCertificateUpload && (
                <button
                  type="button"
                  onClick={handleCertificateCheck}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  <FileText size={13} />
                  Check Uploaded Certificate
                </button>
              )}
            </div>
          )}

          {/* Employer Trust Profile */}
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-sm border border-surface-border">
                {gig.employerName?.[0] || 'E'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-ink">{gig.employerName || 'Local Verified Business'}</h4>
                  <ShieldCheck size={13} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-1.5 text-xxs text-ink-subtle mt-0.5">
                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                    ★ 4.8
                  </span>
                  <span>· 28 shifts fulfilled · Instant Payout Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* On-Duty Checklist (Shown when assigned) */}
          {isAssigned && gig.paymentStatus !== 'paid' && (
            <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Shift Checklist & Procedures
              </h3>
              <div className="space-y-2">
                {checklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex w-full items-center gap-2.5 p-2.5 border border-surface-border hover:bg-stone-50 rounded-lg text-left transition-all text-xs font-medium text-ink-muted"
                  >
                    {item.done ? (
                      <CheckSquare size={15} className="text-brand-600 shrink-0" />
                    ) : (
                      <Square size={15} className="text-stone-300 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-ink-subtle' : ''}>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Sticky Match & Action Panel (5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-sm space-y-5">
            
            {/* Match Score Indicator */}
            <div className="rounded-lg bg-emerald-50/80 border border-emerald-200/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <Sparkles size={14} className="text-emerald-600" />
                  {gig.matchScore || 96}% Match for You
                </span>
                <span className="text-xxs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                  Top Recommended
                </span>
              </div>
              <div className="space-y-1 text-xxs text-emerald-800 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Available during entire shift time window</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Within 1.5 km of your registered location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Matches your declared service competencies</span>
                </div>
              </div>
            </div>

            {/* Payout Display */}
            <div className="flex items-baseline justify-between border-t border-surface-border pt-4">
              <div>
                <span className="text-xxs font-medium text-ink-subtle uppercase">Total Shift Pay</span>
                <p className="text-2xl font-black text-ink">
                  ₹{gig.paymentAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <span className="text-xxs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
                Direct Bank Payout
              </span>
            </div>

            {/* Action State Section */}
            <div className="space-y-3">
              
              {/* STATE 1: PENDING */}
              {isPending && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Hourglass size={14} className="animate-spin-slow text-amber-600" />
                    Application Under Review
                  </div>
                  <p className="text-xxs text-amber-800 leading-relaxed">
                    The employer is reviewing candidate profiles. You will receive an alert once accepted.
                  </p>
                </div>
              )}

              {/* STATE 2: REJECTED */}
              {isRejected && (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-ink-muted">
                  <p className="font-bold text-ink flex items-center gap-1.5">
                    <XCircle size={14} className="text-rose-500" />
                    Shift Staffed by Other Worker
                  </p>
                </div>
              )}

              {/* STATE 3: OPEN / CAN APPLY */}
              {!isAssigned && !isPending && !isRejected && (
                <button
                  onClick={handleApply}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white py-3 text-xs font-bold transition-all shadow-2xs btn-press disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? 'Submitting Application...' : (
                    <>
                      <span>Accept & Apply for Shift</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              )}

              {/* STATE 4: ASSIGNED & ON-SITE OTP VERIFICATION */}
              {isAssigned && (
                <div className="space-y-3">
                  {!gig.checkInTime ? (
                    <div className="space-y-2.5">
                      <label className="text-xxs font-bold text-ink uppercase block">
                        Enter Employer Check-In OTP
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <KeyRound size={14} className="absolute left-3 top-2.5 text-stone-400" />
                          <input
                            type="text"
                            maxLength={4}
                            value={otpInput}
                            onChange={(e) => {
                              setOtpInput(e.target.value);
                              setOtpError(null);
                            }}
                            placeholder="4-digit OTP"
                            className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-border text-xs font-bold text-ink"
                          />
                        </div>
                        <button
                          onClick={() => handleAction('check-in', otpInput)}
                          disabled={actionLoading || otpInput.trim().length === 0}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 shrink-0 btn-press"
                        >
                          {actionLoading ? 'Verifying...' : 'Check In'}
                        </button>
                      </div>
                      {otpError && (
                        <p className="text-xxs font-semibold text-rose-600 flex items-center gap-1">
                          <AlertCircle size={11} /> {otpError}
                        </p>
                      )}
                    </div>
                  ) : gig.paymentStatus === 'paid' ? (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>Shift Completed & Paid</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-3 text-xs font-medium space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Hourglass size={14} className="text-amber-600" />
                        On Duty — Awaiting Employer Payment
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        You checked in successfully. The employer will complete payment via Razorpay to finish this shift.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-surface-border p-3.5 px-4 flex items-center justify-between shadow-md">
        <div>
          <span className="text-xxs font-medium text-ink-subtle uppercase block">Total Pay</span>
          <span className="text-base font-black text-ink">₹{gig.paymentAmount.toLocaleString('en-IN')}</span>
        </div>

        {!isAssigned && !isPending && !isRejected ? (
          <button
            onClick={handleApply}
            disabled={actionLoading}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-xs font-bold shadow-2xs btn-press"
          >
            {actionLoading ? 'Applying...' : 'Apply for Shift'}
          </button>
        ) : isPending ? (
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            Under Review
          </span>
        ) : isAssigned && !gig.checkInTime ? (
          <span className="text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200">
            Awaiting OTP Check In
          </span>
        ) : isAssigned && gig.checkInTime && gig.paymentStatus !== 'paid' ? (
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            Awaiting Payment
          </span>
        ) : isAssigned && gig.paymentStatus === 'paid' ? (
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            Completed & Paid ✓
          </span>
        ) : null}
      </div>

    </div>
  );
}
