'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock4, UploadCloud, RefreshCw } from 'lucide-react';
import type { WorkerVerificationStatusResponse, WorkerVerificationStatus } from '../../types';
import { getMyVerificationStatus } from '../../services/providers';

type BannerState =
  | 'unverified'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'loading'
  | 'error';

const STATUS_COPY: Record<WorkerVerificationStatus, { title: string; body: string; tone: string }> = {
  unverified: {
    title: 'Verification Required',
    body: 'Upload a professional certificate to access gigs. Until an admin approves at least one certificate, your worker profile cannot be booked by seekers.',
    tone: 'amber'
  },
  pending: {
    title: 'Verification Pending',
    body: 'Your certificate is under admin review. You can complete your profile, but gig actions are locked until approval.',
    tone: 'sky'
  },
  approved: {
    title: 'Verified Worker',
    body: 'Your credentials are approved. You can apply, accept and execute gigs.',
    tone: 'emerald'
  },
  rejected: {
    title: 'Verification Rejected',
    body: 'An admin rejected your certificate. Update and re-upload to be re-evaluated.',
    tone: 'rose'
  }
};

export default function WorkerVerificationBanner({ onStatusChange }: { onStatusChange?: (status: WorkerVerificationStatusResponse | null) => void }) {
  const [status, setStatus] = useState<BannerState>('loading');
  const [data, setData] = useState<WorkerVerificationStatusResponse | null>(null);

  const refresh = async () => {
    const res = await getMyVerificationStatus();
    if (!res) {
      setStatus('error');
      setData(null);
      onStatusChange?.(null);
      return;
    }
    setData(res);
    setStatus(res.workerVerificationStatus);
    onStatusChange?.(res);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-2xs animate-pulse text-xs text-ink-subtle font-semibold">
        Checking your verification status…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-2xs text-xs font-semibold text-rose-700 flex items-center gap-2">
        <ShieldAlert size={16} />
        Could not load verification status. Please refresh and try again.
      </div>
    );
  }

  const copy = STATUS_COPY[status as WorkerVerificationStatus];
  const Icon =
    status === 'approved'
      ? ShieldCheck
      : status === 'rejected'
      ? ShieldAlert
      : status === 'pending'
      ? Clock4
      : UploadCloud;

  const toneClasses: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900'
  };

  return (
    <div className={`rounded-2xl border ${toneClasses[copy.tone] || 'border-surface-border bg-white text-ink'} p-5 shadow-2xs flex items-start justify-between gap-4`}>
      <div className="flex items-start gap-3 min-w-0">
        <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
          copy.tone === 'emerald'
            ? 'bg-emerald-100 text-emerald-700'
            : copy.tone === 'rose'
            ? 'bg-rose-100 text-rose-700'
            : copy.tone === 'sky'
            ? 'bg-sky-100 text-sky-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold leading-tight">{copy.title}</h3>
            <span className={`text-xxs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              copy.tone === 'emerald'
                ? 'border-emerald-300 bg-white/60 text-emerald-800'
                : copy.tone === 'rose'
                ? 'border-rose-300 bg-white/60 text-rose-800'
                : copy.tone === 'sky'
                ? 'border-sky-300 bg-white/60 text-sky-800'
                : 'border-amber-300 bg-white/60 text-amber-800'
            }`}>
              {status}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed opacity-90">{copy.body}</p>
          {status === 'rejected' && data?.latestRejectionReason && (
            <p className="text-xxs mt-2 font-semibold opacity-80">
              Reason: {data.latestRejectionReason}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={refresh}
        className="shrink-0 p-2 rounded-lg bg-white/70 border border-current/20 hover:bg-white transition-colors"
        title="Refresh verification status"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
}
