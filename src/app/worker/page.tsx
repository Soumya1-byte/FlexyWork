'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Briefcase, Star, ShieldCheck, MapPin, Clock, ArrowRight, RefreshCw
} from 'lucide-react';
import type { Gig, User } from '../../types';
import GigCard from '../../components/shared/GigCard';
import EarningsChart from '../../components/charts/EarningsChart';
import EmptyState from '../../components/ui/EmptyState';
import WorkerVerificationBanner from '../../components/worker/WorkerVerificationBanner';
import CertificateSection from '../../components/worker/CertificateSection';
import { getMe } from '../../services/auth';
import { getGigs, getMyGigs } from '../../services/gigs';
import { getMyWorkerProfile } from '../../services/providers';
import { getPayments } from '../../services/payments';

export default function WorkerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeGigs, setActiveGigs] = useState<Gig[]>([]);
  const [opportunities, setOpportunities] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerStats, setWorkerStats] = useState({ rating: 0, completedGigsCount: 0, reliabilityScore: 0, grossEarnings: 0 });

  const fetchWorkerDashboardData = async () => {
    setLoading(true);
    const user = await getMe();
    setCurrentUser(user);

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'worker') {
      router.push('/home');
      return;
    }

    const [opps, myGigs, profile, payments] = await Promise.all([
      getGigs().catch(() => []), 
      getMyGigs(user.id, user.role).catch(() => []), 
      getMyWorkerProfile().catch(() => null), 
      getPayments().catch(() => [])
    ]);

    setOpportunities(opps.filter((gig) => 
      gig.status === 'REQUESTED' && 
      !gig.assignedWorkerIds?.includes(user.id) && 
      (gig.assignedWorkerIds?.length || 0) < (gig.workersRequired || 1)
    ));
    setActiveGigs(myGigs.filter((gig) => gig.status !== 'COMPLETED' && gig.status !== 'DECLINED'));
    const gross = payments.reduce((sum, tx) => sum + tx.amount, 0);
    setWorkerStats({
      rating: profile?.rating || 0,
      completedGigsCount: profile?.completedGigsCount || 0,
      reliabilityScore: profile?.reliabilityScore || 96,
      grossEarnings: gross
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkerDashboardData();
    const interval = setInterval(fetchWorkerDashboardData, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const nextShift = activeGigs[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">

      {/* Worker Verification Trust Barrier Banner */}
      <WorkerVerificationBanner />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Good morning, {currentUser?.name.split(' ')[0] || 'Worker'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5 font-medium">
            {currentUser?.location || 'Indiranagar'} · Ready for shifts today
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkerDashboardData}
            className="p-2 text-ink-muted hover:text-ink hover:bg-stone-100 rounded-lg transition-colors border border-surface-border"
            title="Refresh Listings"
          >
            <RefreshCw size={14} />
          </button>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Shift Matcher Active
          </div>
        </div>
      </div>

      <CertificateSection />

      {/* Featured: Your Next Shift */}
      {nextShift && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xxs font-bold uppercase tracking-wider text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
              Your Next Shift
            </span>
            <span className="text-xs font-bold text-ink">
              ₹{nextShift.paymentAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink">{nextShift.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mt-1">
                <span className="flex items-center gap-1 font-medium text-ink">
                  <Clock size={13} className="text-brand-600" />
                  {nextShift.date} · {nextShift.time} ({nextShift.duration})
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {nextShift.location}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/worker/gigs/${nextShift.id}`}
                className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              >
                Go to Shift & Check In
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Listings & Right Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 Cols: Recommended Shifts */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Assigned Gigs if more than 1 */}
          {activeGigs.length > 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Other Scheduled Shifts</h2>
                <span className="text-xs text-ink-subtle">{activeGigs.length} total</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeGigs.slice(1).map(g => (
                  <GigCard 
                    key={g.id} 
                    gig={g} 
                    viewMode="worker" 
                    onActionComplete={fetchWorkerDashboardData} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available Recommended Shifts */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-surface-border pb-2">
              <div>
                <h2 className="text-base font-bold text-ink">Recommended Shifts Around You</h2>
                <p className="text-xs text-ink-muted">Matching your skills, hourly rate, and neighborhood</p>
              </div>
              <Link href="/worker/gigs?tab=available" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                View all ({opportunities.length}) <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div className="h-40 bg-white border border-surface-border rounded-xl animate-pulse" />
            ) : opportunities.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No shifts matching right now"
                description="New local opportunities are posted regularly. Keep notifications on for instant alerts."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {opportunities.slice(0, 4).map(g => (
                  <GigCard 
                    key={g.id} 
                    gig={g} 
                    viewMode="worker" 
                    onActionComplete={fetchWorkerDashboardData} 
                  />
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 4 Cols: Reliability, Earnings, Availability */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Worker Stats Card */}
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-surface-border pb-2">
              Performance & Earnings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xxs font-medium text-ink-subtle uppercase">Month Payout</span>
                <p className="text-xl font-bold text-ink mt-0.5">₹{workerStats.grossEarnings.toLocaleString('en-IN')}</p>
                <span className="text-xxs text-emerald-600 font-semibold">Direct bank transfer</span>
              </div>
              <div>
                <span className="text-xxs font-medium text-ink-subtle uppercase">Completed</span>
                <p className="text-xl font-bold text-ink mt-0.5">{workerStats.completedGigsCount}</p>
                <span className="text-xxs text-ink-subtle font-medium">Shifts verified</span>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1.5 text-ink">
                <ShieldCheck size={15} className="text-emerald-600" />
                <span>Reliability: <strong>{workerStats.reliabilityScore}%</strong></span>
              </div>
              <div className="flex items-center gap-1 text-ink">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>{workerStats.rating > 0 ? `${workerStats.rating} / 5.0` : '4.9 / 5.0'}</span>
              </div>
            </div>
          </div>

          {/* Earnings Mini Chart */}
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink">Weekly Payout Trends</h3>
              <Link href="/worker/earnings" className="text-xxs font-bold text-brand-600 hover:underline">
                Full Statement →
              </Link>
            </div>
            <EarningsChart />
          </div>

          {/* Availability Status Card */}
          <div className="bg-white border border-surface-border rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink">Your Availability</h3>
              <span className="text-xxs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Accepting evening and weekend shifts (5:00 PM – 11:00 PM) in Indiranagar & Koramangala.
            </p>
            <Link
              href="/worker/profile"
              className="inline-flex text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
            >
              Update Availability Slots →
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
