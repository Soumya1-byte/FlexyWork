'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  RefreshCw,
  Award,
  Search
} from 'lucide-react';
import {
  AdminCertificateRow,
  getAllCertifications,
  setCertificateVerification
} from '../../services/admin';
import type { Certification, VerificationStatus } from '../../types';

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
        <ShieldAlert size={12} /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
      <Clock size={12} /> Pending
    </span>
  );
}

export default function CertificateReviewPanel() {
  const [rows, setRows] = useState<AdminCertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyId, setBusyId] = useState<string>('');
  const [rejectionTarget, setRejectionTarget] = useState<{ workerId: string; certId: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllCertifications();
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleVerify = async (workerId: string, certId: string) => {
    setBusyId(`${workerId}:${certId}`);
    try {
      const updated = await setCertificateVerification(workerId, certId, {
        verificationStatus: 'verified'
      });
      setRows((prev) =>
        prev.map((r) =>
          r.workerId === workerId && r.certification.id === certId
            ? { ...r, certification: updated }
            : r
        )
      );
      setFeedback('Certificate marked as Verified.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Unable to verify.');
    } finally {
      setBusyId('');
    }
  };

  const handleReject = async () => {
    if (!rejectionTarget) return;
    const { workerId, certId } = rejectionTarget;
    setBusyId(`${workerId}:${certId}`);
    try {
      const updated = await setCertificateVerification(workerId, certId, {
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason.trim() || 'Did not meet verification criteria.'
      });
      setRows((prev) =>
        prev.map((r) =>
          r.workerId === workerId && r.certification.id === certId
            ? { ...r, certification: updated }
            : r
        )
      );
      setFeedback('Certificate rejected and worker notified.');
      setTimeout(() => setFeedback(''), 3000);
      setRejectionTarget(null);
      setRejectionReason('');
    } catch (e: any) {
      setError(e.message || 'Unable to reject.');
    } finally {
      setBusyId('');
    }
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.certification.verificationStatus !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.workerName.toLowerCase().includes(q) ||
      r.workerEmail.toLowerCase().includes(q) ||
      r.certification.title.toLowerCase().includes(q) ||
      r.certification.issuingOrganization.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-brand-600" />
          <h3 className="font-bold text-sm text-ink">Certificate Verification Queue</h3>
        </div>
        <button
          onClick={load}
          className="p-2 bg-white border border-surface-border text-ink-muted hover:text-ink rounded-xl transition-all shadow-sm shrink-0"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by worker, email or certificate title..."
            className="w-full rounded-xl border border-surface-border bg-stone-50/50 px-10 py-2.5 text-xs text-ink font-medium"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | VerificationStatus)}
          className="rounded-xl border border-surface-border bg-stone-50/50 px-3 py-2.5 text-xs text-ink font-bold"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-xs text-ink-subtle uppercase tracking-wider animate-pulse">
          Loading certificates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs text-ink-subtle italic">
          No certificates match the current filter.
        </div>
      ) : (
        <div className="divide-y divide-surface-border">
          {filtered.map((row) => {
            const cert = row.certification;
            const key = `${row.workerId}:${cert.id}`;
            const busy = busyId === key;
            return (
              <div key={key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-ink truncate">{cert.title}</h4>
                      <StatusBadge status={cert.verificationStatus} />
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      <strong className="text-ink">{row.workerName}</strong>
                      {' · '}
                      {row.workerEmail}
                    </p>
                    <p className="text-[11px] text-ink-subtle">
                      <strong className="text-ink">Issuer:</strong> {cert.issuingOrganization}
                      {' · '}
                      <strong className="text-ink">Issued:</strong> {cert.issueDate}
                      {cert.expiryDate ? ` · Expires: ${cert.expiryDate}` : ''}
                      {cert.credentialId ? ` · ID: ${cert.credentialId}` : ''}
                    </p>
                    {cert.description && (
                      <p className="text-[11px] text-ink-muted leading-relaxed pt-1 line-clamp-2">
                        {cert.description}
                      </p>
                    )}
                    {cert.rejectionReason && cert.verificationStatus === 'rejected' && (
                      <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2 mt-1">
                        <strong>Reason:</strong> {cert.rejectionReason}
                      </p>
                    )}
                    {cert.documentUrl && /^https?:\/\//i.test(cert.documentUrl) && (
                      <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 pt-1"
                      >
                        <ExternalLink size={11} /> View Document
                      </a>
                    )}
                    {cert.documentDataUrl && (
                      <a
                        href={cert.documentDataUrl}
                        download={cert.documentFileName || `${cert.title}-certificate`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 pt-1"
                      >
                        <ExternalLink size={11} /> Download Uploaded File
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cert.verificationStatus !== 'verified' && (
                      <button
                        onClick={() => handleVerify(row.workerId, cert.id)}
                        disabled={busy}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 px-3 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {busy ? 'Working...' : 'Approve'}
                      </button>
                    )}
                    {cert.verificationStatus !== 'rejected' && (
                      <button
                        onClick={() => {
                          setRejectionTarget({ workerId: row.workerId, certId: cert.id });
                          setRejectionReason(cert.rejectionReason || '');
                        }}
                        disabled={busy}
                        className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 py-1.5 px-3 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline rejection form */}
                {rejectionTarget && rejectionTarget.workerId === row.workerId && rejectionTarget.certId === cert.id && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <label className="text-[11px] font-bold text-rose-800 block">
                      Reason for rejecting (visible to worker):
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Document unclear or credential ID does not match issuer records."
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setRejectionTarget(null);
                          setRejectionReason('');
                        }}
                        className="rounded-lg border border-surface-border bg-white text-ink px-3 py-1.5 text-[11px] font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={busy}
                        className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-[11px] font-bold disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
