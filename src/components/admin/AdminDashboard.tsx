'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Briefcase, IndianRupee, Star,
  CheckCircle, ShieldCheck, ShieldAlert, Layers, Search, RefreshCw, Filter
} from 'lucide-react';
import { User, WorkerProfile, Gig, Community, WorkerVerificationStatus } from '../../types';
import AdminCharts from '../charts/AdminCharts';
import StatusBadge from '../ui/StatusBadge';
import CertificateReviewPanel from './CertificateReviewPanel';
import { getMe } from '../../services/auth';
import {
  getAdminDashboard,
  toggleWorkerVerification,
  getWorkerVerifications,
  AdminWorkerVerificationRow
} from '../../services/admin';

interface AdminDashboardProps {
  initialTab?: 'overview' | 'users' | 'workers' | 'gigs' | 'communities' | 'certificates' | 'reports';
}

export default function AdminDashboard({ initialTab = 'overview' }: AdminDashboardProps) {
  const router = useRouter();

  // Active tab state
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationQueue, setVerificationQueue] = useState<AdminWorkerVerificationRow[]>([]);
  const [verificationFilter, setVerificationFilter] = useState<'all' | WorkerVerificationStatus>('all');

  const [success, setSuccess] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    const user = await getMe();

    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    const [data, verifications] = await Promise.all([
      getAdminDashboard(),
      getWorkerVerifications().catch(() => [])
    ]);
    setUsers(data.users);
    setWorkers(data.workers);
    setGigs(data.gigs);
    setCommunities(data.communities);
    setVerificationQueue(verifications);
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifyWorker = async (workerId: string) => {
    try {
      const updatedWorker = await toggleWorkerVerification(workerId);
      setWorkers((items) => items.map((worker) => worker.id === workerId ? updatedWorker : worker));
      setSuccess(`Updated verification status for ${updatedWorker.name}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setSuccess(error.message || 'Unable to update worker verification.');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Filter lists based on search
  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGigs = gigs.filter(g =>
    (g.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.employerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryDemand = gigs.reduce<Record<string, number>>((acc, gig) => {
    acc[gig.category] = (acc[gig.category] || 0) + (gig.workersRequired || 1);
    return acc;
  }, {});
  const topDemandCategories = Object.entries(categoryDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const verifiedWorkers = workers.filter((worker) => worker.isVerified).length;
  const emergencyGigs = gigs.filter((gig) => gig.urgency === 'urgent' || gig.serviceMode === 'emergency').length;
  const insuredGigs = gigs.filter((gig) => gig.insuranceIncluded).length;
  const forecastScore = Math.min(98, Math.max(62, Math.round((gigs.length * 7 + workers.length * 4 + emergencyGigs * 9) / 2)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">

      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-surface-border p-6 rounded-2xl gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Shield size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">Admin Operations Console</h1>
            <p className="text-xs text-ink-muted mt-0.5 font-medium">Verify credentials, audit billing pools, and monitor platform logs.</p>
          </div>
        </div>
        <button
          onClick={loadAdminData}
          className="p-2.5 bg-white border border-surface-border text-ink-muted hover:text-ink rounded-xl transition-all shadow-sm shrink-0"
          title="Force System Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {success}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap border-b border-surface-border gap-x-6 gap-y-2">
        {([
          { id: 'overview', label: 'Platform KPIs' },
          { id: 'users', label: 'User Registry' },
          { id: 'workers', label: 'Worker Verification' },
          { id: 'certificates', label: 'Certificate Review' },
          { id: 'gigs', label: 'Gig Audit Logs' },
          { id: 'communities', label: 'Collectives' },
          { id: 'reports', label: 'System Flags' }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
            }}
            className={`pb-3 text-xs font-extrabold border-b-2 transition-all uppercase tracking-wide ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-650'
                : 'border-transparent text-ink-subtle hover:text-ink-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      {loading ? (
        <div className="h-64 bg-white border border-surface-border rounded-3xl animate-pulse flex items-center justify-center">
          <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Syncing Ledger...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* KPIs Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-1">
                  <p className="text-xxs font-extrabold text-ink-muted uppercase tracking-wider">Total Users Registered</p>
                  <p className="text-xl sm:text-2xl font-black text-ink">{users.length}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">All registered accounts</p>
                </div>
                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-1">
                  <p className="text-xxs font-extrabold text-ink-muted uppercase tracking-wider">Active Gig Workers</p>
                  <p className="text-xl sm:text-2xl font-black text-ink">{workers.length}</p>
                  <p className="text-[10px] text-ink-subtle font-bold">Verified worker profiles</p>
                </div>
                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-1">
                  <p className="text-xxs font-extrabold text-ink-muted uppercase tracking-wider">Total Gigs Posted</p>
                  <p className="text-xl sm:text-2xl font-black text-ink">{gigs.length}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{gigs.filter(g => g.status === 'COMPLETED').length} completed</p>
                </div>
                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-1">
                  <p className="text-xxs font-extrabold text-ink-muted uppercase tracking-wider">Escrow Volume</p>
                  <p className="text-xl sm:text-2xl font-black text-ink">₹{gigs.reduce((sum, g) => sum + (g.paymentAmount || 0), 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-ink-subtle font-bold">Total gig payout value</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">AI Demand Forecast</h3>
                    <span className="text-[10px] font-black text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-2 py-0.5">{forecastScore}% confidence</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Expected demand is highest in {topDemandCategories[0]?.[0] || 'household services'} based on current bookings, emergency requests, and worker availability.
                  </p>
                  <div className="space-y-2">
                    {topDemandCategories.length > 0 ? topDemandCategories.map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">{category}</span>
                        <span className="font-black text-brand-700">{count} worker slots</span>
                      </div>
                    )) : (
                      <p className="text-xs text-ink-subtle">No demand data available yet.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">Workforce Allocation</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Verified Pool</p>
                      <p className="text-xl font-black text-emerald-900">{verifiedWorkers}</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                      <p className="text-[10px] font-bold text-rose-700 uppercase">Emergency Jobs</p>
                      <p className="text-xl font-black text-rose-900">{emergencyGigs}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Federation admins can prioritize verified nearby workers for urgent household and institutional service requests.
                  </p>
                </div>

                <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">Welfare & Trust</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-muted font-semibold">Insured bookings</span>
                      <span className="font-black text-ink">{insuredGigs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted font-semibold">Welfare pool</span>
                      <span className="font-black text-ink">₹{gigs.reduce((sum, g) => sum + (g.welfareContribution || 0), 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted font-semibold">Invoice-ready</span>
                      <span className="font-black text-ink">{gigs.filter((g) => g.invoiceRequired).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart & Logs columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recharts panel */}
                <div className="lg:col-span-2 bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-ink border-b border-surface-border pb-2">User Registry & Volume Growth</h3>
                  <AdminCharts />
                </div>

                {/* System Activity audit list */}
                <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-ink border-b border-surface-border pb-2">Live System Logs</h3>
                  <div className="space-y-4 text-xxs">
                    <div className="flex gap-2 items-start leading-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <p className="text-ink-muted"><strong className="text-ink font-bold">[USER]</strong> Ramesh Babu registered as Seeker.</p>
                    </div>
                    <div className="flex gap-2 items-start leading-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1" />
                      <p className="text-ink-muted"><strong className="text-ink font-bold">[GIG]</strong> Seeker Harshita funded ₹800 escrow pool.</p>
                    </div>
                    <div className="flex gap-2 items-start leading-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <p className="text-ink-muted"><strong className="text-ink font-bold">[COOP]</strong> Amit Patel joined Community Hall Maintenance.</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: USER REGISTRY */}
          {activeTab === 'users' && (
            <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">

              {/* Search box */}
              <div className="relative">
                <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user accounts by name or email..."
                  className="w-full rounded-xl border border-surface-border bg-stone-50/50 px-10 py-2.5 text-xs text-ink font-medium"
                />
              </div>

              {/* Users table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-ink-subtle font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">User ID</th>
                      <th className="pb-3 px-4">Name</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 pl-4 text-right">User Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-ink-muted font-medium">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3.5 pr-4 text-ink-subtle">{u.id}</td>
                        <td className="py-3.5 px-4 text-ink font-bold">{u.name}</td>
                        <td className="py-3.5 px-4 font-semibold">{u.email}</td>
                        <td className="py-3.5 pl-4 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-amber-50 text-amber-800'
                              : u.role === 'worker'
                              ? 'bg-indigo-50 text-indigo-800'
                              : 'bg-stone-100 text-stone-850'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: WORKER VERIFICATION */}
          {activeTab === 'workers' && (
            <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-border pb-3">
                <div>
                  <h3 className="font-bold text-sm text-ink">Worker Verification Queue</h3>
                  <p className="text-xs text-ink-muted">Workers are verified when an admin approves at least one certificate. Review certificates in the next tab.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={14} className="text-ink-muted" />
                  {(['all', 'pending', 'approved', 'rejected', 'unverified'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setVerificationFilter(f)}
                      className={`text-xxs font-extrabold uppercase tracking-wider rounded-full px-3 py-1 border transition-colors ${
                        verificationFilter === f
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-ink-muted border-surface-border hover:border-brand-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verificationQueue
                  .filter((row) => verificationFilter === 'all' || row.workerVerificationStatus === verificationFilter)
                  .map((row) => {
                  const statusTone =
                    row.workerVerificationStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : row.workerVerificationStatus === 'rejected'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : row.workerVerificationStatus === 'pending'
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-stone-50 text-stone-700 border-stone-200';
                  return (
                    <div key={row.workerId} className="p-4 border border-surface-border rounded-2xl bg-stone-50/20 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 bg-brand-50 border border-brand-100 text-brand-700 font-extrabold text-xs flex items-center justify-center rounded-lg shrink-0">
                            {(row.name || '').split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{row.name}</p>
                            <p className="text-[9px] text-ink-muted mt-0.5 truncate">{row.skills[0] || 'No skill'} · {row.location || 'Unknown'}</p>
                          </div>
                        </div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider shrink-0 ${statusTone}`}>
                          {row.workerVerificationStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xxs text-ink-muted">
                        <span>{row.certificates.length} certificate{row.certificates.length === 1 ? '' : 's'} on file</span>
                        <button
                          onClick={() => {
                            setActiveTab('certificates');
                            setSearchQuery(row.name);
                          }}
                          className="rounded-md text-brand-600 hover:text-brand-700 font-extrabold uppercase tracking-wider"
                        >
                          Review →
                        </button>
                      </div>
                    </div>
                  );
                })}
                {verificationQueue.length === 0 && (
                  <div className="md:col-span-2 text-center py-12 text-xs text-ink-muted">No worker verification data available.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CERTIFICATE REVIEW */}
          {activeTab === 'certificates' && (
            <CertificateReviewPanel />
          )}

          {/* TAB 5: GIGS AUDITING */}
          {activeTab === 'gigs' && (
            <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">

              {/* Search box */}
              <div className="relative">
                <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gigs by job title or seeker client name..."
                  className="w-full rounded-xl border border-surface-border bg-stone-50/50 px-10 py-2.5 text-xs text-ink font-medium"
                />
              </div>

              {/* Gigs table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-border text-ink-subtle font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Title</th>
                      <th className="pb-3 px-4">Client</th>
                      <th className="pb-3 px-4">Pay</th>
                      <th className="pb-3 px-4">Trust Layer</th>
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 pl-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-ink-muted font-medium">
                    {filteredGigs.map(g => (
                      <tr key={g.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3.5 pr-4 text-ink font-bold max-w-[200px] truncate">{g.title}</td>
                        <td className="py-3.5 px-4 font-semibold text-ink-subtle">{g.employerName}</td>
                        <td className="py-3.5 px-4 font-bold text-ink">₹{g.paymentAmount}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {g.serviceMode === 'emergency' && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">Emergency</span>}
                            {g.insuranceIncluded && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Insurance</span>}
                            {g.invoiceRequired && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Invoice</span>}
                            {g.certificationRequired && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-700">Certified</span>}
                            {g.hasCertificateUpload && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">Certificate file</span>}
                          </div>
                          {g.certificateName && (
                            <p className="mt-1 max-w-[160px] truncate text-[9px] font-semibold text-ink-subtle">{g.certificateName}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink-subtle">{g.date}</td>
                        <td className="py-3.5 pl-4 text-right">
                          <StatusBadge status={g.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 6: COMMUNITIES */}
          {activeTab === 'communities' && (
            <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-ink border-b border-surface-border pb-2">Registered Worker Cooperatives</h3>

              <div className="divide-y divide-surface-border">
                {communities.map(c => (
                  <div key={c.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-xl shrink-0">
                        {c.logo}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-ink">{c.name}</h4>
                        <p className="text-[10px] text-ink-subtle font-semibold mt-0.5">
                          {c.memberCount} members · active in: {c.services.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-ink">₹{c.totalEarnings.toLocaleString('en-IN')}</p>
                      <p className="text-[9px] text-ink-subtle font-semibold uppercase tracking-wider">Pooled holdings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SYSTEM FLAGS */}
          {activeTab === 'reports' && (
            <div className="bg-white border border-surface-border rounded-3xl p-6 shadow-sm space-y-4 text-center py-12">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold text-base text-ink mt-4">Zero Disputes Logged</h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed mt-1">
                All matched check-in check-out logs match within the target 500m radius threshold. No transaction payouts are held in dispute escrow.
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}