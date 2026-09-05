'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Plus, Calendar, AlertCircle, Users, ArrowRight, Clock, Store, ShieldCheck } from 'lucide-react';
import type { WorkerProfile, Gig, User } from '../../types';
import ProviderCard from '../../components/shared/ProviderCard';
import GigCard from '../../components/shared/GigCard';
import { getMe } from '../../services/auth';
import { getMyGigs } from '../../services/gigs';
import { getProviders } from '../../services/providers';

export default function SeekerHome() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<WorkerProfile[]>([]);
  const [activeGigs, setActiveGigs] = useState<Gig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      const user = await getMe();
      setCurrentUser(user);

      if (!user) {
        router.push('/login');
        return;
      }

      if (user.role === 'worker') {
        router.push('/worker');
        return;
      }

      const [providersData, gigsData] = await Promise.all([
        getProviders().catch(() => []),
        getMyGigs(user.id, user.role).catch(() => [])
      ]);
      setProviders(providersData);
      setActiveGigs(gigsData);
      setLoading(false);
    };

    loadHomeData();
  }, [router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/explore?search=${encodeURIComponent(searchQuery)}`);
  };

  const openShifts = activeGigs.filter(g => g.status === 'REQUESTED' || g.status === 'published');
  const staffedShifts = activeGigs.filter(g => g.status === 'ACCEPTED' || g.status === 'IN_PROGRESS' || g.status === 'filled' || g.status === 'in_progress');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Good morning, {currentUser?.name.split(' ')[0] || 'Employer'}
          </h1>
          <p className="text-xs text-ink-muted mt-0.5 font-medium">
            {currentUser?.location || 'Indiranagar'} · Employer Management Portal
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/post-gig"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <Plus size={15} />
            Post New Shift
          </Link>
          <Link
            href="/posted-gigs"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 border border-surface-border text-ink px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-2xs transition-all"
          >
            <Calendar size={14} className="text-ink-subtle" />
            Manage Shifts ({activeGigs.length})
          </Link>
        </div>
      </div>

      {/* Shift Staffing Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-2xs">
          <span className="text-xxs font-medium text-ink-subtle uppercase">Active Shifts</span>
          <p className="text-xl font-bold text-ink mt-0.5">{staffedShifts.length}</p>
          <span className="text-xxs text-emerald-600 font-semibold">Staffed & in progress</span>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-2xs">
          <span className="text-xxs font-medium text-ink-subtle uppercase">Open Positions</span>
          <p className="text-xl font-bold text-ink mt-0.5">{openShifts.length}</p>
          <span className="text-xxs text-amber-600 font-semibold">Awaiting worker acceptance</span>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4 shadow-2xs">
          <span className="text-xxs font-medium text-ink-subtle uppercase">Available Talent Nearby</span>
          <p className="text-xl font-bold text-ink mt-0.5">{providers.length}</p>
          <span className="text-xxs text-brand-600 font-semibold">Verified local workers</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-surface-border rounded-xl p-4 shadow-2xs space-y-2">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute top-1/2 left-3.5 -translate-y-1/2 text-stone-400 shrink-0" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local workers by skill (e.g. barista, cashier, electrician, packing)..."
              className="w-full rounded-lg border border-surface-border bg-stone-50/50 py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-stone-400 font-medium focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 text-xs font-bold transition-colors shrink-0"
          >
            Search Workers
          </button>
        </form>
      </div>

      {/* Posted Shifts Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-surface-border pb-2">
          <div>
            <h2 className="text-base font-bold text-ink">Your Posted Shifts & Status</h2>
            <p className="text-xs text-ink-muted">Track staffing, check-ins, and completion in real time</p>
          </div>
          <Link href="/posted-gigs" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View All Shifts ({activeGigs.length}) <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="h-40 bg-white border border-surface-border rounded-xl animate-pulse" />
        ) : activeGigs.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-xl p-8 text-center space-y-3">
            <p className="text-xs text-ink-muted">You haven't posted any shifts yet.</p>
            <Link
              href="/post-gig"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-2xs"
            >
              <Plus size={14} />
              Post Your First Shift
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGigs.slice(0, 4).map((gig) => (
              <GigCard 
                key={gig.id} 
                gig={gig} 
                viewMode="seeker" 
                onActionComplete={() => {
                  if (currentUser) {
                    getMyGigs(currentUser.id, currentUser.role).then(setActiveGigs);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available Verified Workers Around You */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-surface-border pb-2">
          <div>
            <h2 className="text-base font-bold text-ink">Verified Local Workers in Indiranagar</h2>
            <p className="text-xs text-ink-muted">Directly message or invite workers with strong reliability ratings</p>
          </div>
          <Link href="/explore" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            Browse All Profiles <ArrowRight size={12} />
          </Link>
        </div>
        
        {providers.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-xl p-6 text-center text-xs text-ink-muted">
            No worker profiles found in your immediate radius.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.slice(0, 3).map((w) => (
              <ProviderCard key={w.id} provider={w} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
