'use client';

import React from 'react';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  Check
} from 'lucide-react';
import type { Certification, VerificationStatus } from '../../types';

interface Props {
  certifications?: Certification[];
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
        <ShieldCheck size={12} /> Verified
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
        <ShieldAlert size={12} /> Not Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
      <Clock size={12} /> Awaiting Review
    </span>
  );
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function PublicCertificates({ certifications = [] }: Props) {
  if (!certifications || certifications.length === 0) {
    return (
      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-base text-ink flex items-center gap-1.5 mb-3">
          <Award size={18} className="text-brand-500" />
          Certifications
        </h3>
        <p className="text-xs text-ink-subtle italic">
          This professional has not added any certifications yet.
        </p>
      </div>
    );
  }

  // Sort: verified first, then pending, then rejected.
  const order: Record<VerificationStatus, number> = { verified: 0, pending: 1, rejected: 2 };
  const sorted = [...certifications].sort(
    (a, b) => order[a.verificationStatus] - order[b.verificationStatus]
  );

  return (
    <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h3 className="font-bold text-base text-ink flex items-center gap-1.5">
          <Award size={18} className="text-brand-500" />
          Certifications
        </h3>
        <span className="text-xxs font-extrabold uppercase tracking-wider text-ink-subtle">
          {certifications.length} {certifications.length === 1 ? 'Credential' : 'Credentials'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((cert) => {
          const isVerified = cert.verificationStatus === 'verified';
          const docUrl = cert.documentUrl && isSafeUrl(cert.documentUrl) ? cert.documentUrl : '';
          return (
            <div
              key={cert.id}
              className={`relative rounded-xl border p-4 transition-all ${
                isVerified
                  ? 'border-emerald-200 bg-emerald-50/30 shadow-2xs'
                  : 'border-surface-border bg-stone-50/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center ${
                      isVerified
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {isVerified ? <Check size={14} /> : <Award size={14} />}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-ink leading-snug truncate">
                      {cert.title}
                    </h4>
                    <p className="text-[11px] text-ink-muted mt-0.5">{cert.issuingOrganization}</p>
                  </div>
                </div>
                <StatusBadge status={cert.verificationStatus} />
              </div>

              <div className="space-y-0.5 text-[11px] text-ink-subtle mt-2">
                <p>
                  <strong className="text-ink">Issued:</strong> {cert.issueDate}
                </p>
                {cert.expiryDate && (
                  <p>
                    <strong className="text-ink">Expires:</strong> {cert.expiryDate}
                  </p>
                )}
                {cert.credentialId && (
                  <p className="truncate">
                    <strong className="text-ink">Credential ID:</strong> {cert.credentialId}
                  </p>
                )}
              </div>

              {cert.description && (
                <p className="text-[11px] text-ink-muted leading-relaxed mt-2 line-clamp-3">
                  {cert.description}
                </p>
              )}

              {docUrl && (
                <div className="pt-3 mt-3 border-t border-surface-border">
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 text-[11px] font-bold shadow-2xs btn-press transition-all"
                  >
                    <ExternalLink size={12} /> View Certificate
                  </a>
                </div>
              )}
              {cert.documentDataUrl && (
                <div className="pt-3 mt-3 border-t border-surface-border">
                  <a
                    href={cert.documentDataUrl}
                    download={cert.documentFileName || `${cert.title}-certificate`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 text-[11px] font-bold shadow-2xs btn-press transition-all"
                  >
                    <ExternalLink size={12} /> View Certificate
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
