'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Star, Users, ArrowRight, CheckCircle, 
  MapPin, Clock, IndianRupee, Store, Coffee, Package, Wrench, Sparkles, Building2
} from 'lucide-react';

export default function LandingPage() {
  const categories = [
    { name: 'Electricians & Plumbers', role: 'Repairs, fittings, emergency maintenance', icon: Wrench, count: '22 verified workers' },
    { name: 'Domestic & Cleaning Help', role: 'Housekeeping, deep cleaning, sanitization', icon: Store, count: '31 verified workers' },
    { name: 'Caregivers & Drivers', role: 'Elder care, mobility support, local driving', icon: Users, count: '16 verified workers' },
    { name: 'Gardeners & Painters', role: 'Outdoor care, wall finish, seasonal upkeep', icon: Package, count: '14 verified workers' },
    { name: 'Technicians', role: 'AC, RO, appliance, and device services', icon: Coffee, count: '19 verified workers' },
  ];

  const solutionFeatures = [
    'Service provider registration and verification',
    'Worker skill profiling and certification',
    'Customer booking and scheduling system',
    'Geo-location based service matching',
    'Digital payments and invoicing',
    'Rating and feedback mechanism',
    'Worker welfare and insurance integration',
    'Emergency and on-demand service booking',
    'Cooperative federation administration dashboard',
    'Multilingual mobile-ready experience',
    'AI demand forecasting and workforce allocation',
    'Cloud-ready software deployment'
  ];

  return (
    <div className="relative bg-surface-soft min-h-screen text-ink">
      
      {/* Subtle background ambient line */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e7e5e433_1px,transparent_1px),linear-gradient(to_bottom,#e7e5e433_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-surface-border px-3.5 py-1 text-xs font-semibold text-ink-muted shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Cooperative-owned service marketplace for local labour federations</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink leading-[1.08]">
              Verified services for homes. <br />
              <span className="text-brand-600">Fair work for cooperative workers.</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl font-normal">
              FlexyWork helps Labour Cooperative Federations and Societies connect skilled electricians, plumbers, caregivers, cleaners, drivers, gardeners, painters, domestic helpers, and technicians with households and institutions that need trusted services.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3.5 font-bold shadow-sm shadow-brand-500/20 transition-all text-sm group"
              >
                Register as Worker
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link 
                href="/post-gig" 
                className="inline-flex items-center justify-center rounded-xl bg-white hover:bg-stone-50 text-ink px-6 py-3.5 font-semibold border border-surface-border transition-all text-sm shadow-2xs"
              >
                Book a Service
              </Link>
            </div>

            {/* Quick Proofline */}
            <div className="flex items-center gap-6 pt-4 text-xs font-medium text-ink-muted border-t border-surface-border">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-brand-600" />
                <span>Verified skills, certificates, and federation approval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={15} className="text-brand-600" />
                <span>Fair wages, insurance, invoice, and welfare support</span>
              </div>
            </div>
          </div>

          {/* Right Product Interaction Showcase */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs">
                    <Store size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink">Apartment Welfare Association</h3>
                    <p className="text-xxs text-ink-subtle">Indiranagar, Bangalore</p>
                  </div>
                </div>
                <span className="text-xxs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                  Emergency
                </span>
              </div>

              {/* Shift details */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-bold text-ink">Verified Electrician for Wiring Repair</h4>
                  <span className="text-sm font-black text-ink">₹1,200 <span className="text-xxs font-normal text-ink-subtle">/ job</span></span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Urgent switchboard repair with certified worker, safety checklist, digital invoice, and insurance cover.
                </p>
                <div className="flex items-center gap-3 text-xs text-ink-subtle pt-1 font-medium">
                  <span className="flex items-center gap-1"><Clock size={13} /> Today · 2 PM – 6 PM</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> 3 km match radius</span>
                </div>
              </div>

              {/* Match Resolution Card */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      PS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Ravi Kumar</p>
                      <p className="text-xxs text-emerald-800">Certified electrician · 4.9 rating</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    96% Match
                  </span>
                </div>
                <p className="text-xxs text-emerald-800 leading-normal">
                  Available now · 2.4 km away · Federation verified · insurance eligible
                </p>
              </div>

              <div className="flex items-center justify-between text-xxs text-ink-subtle pt-1">
                <span>Average emergency match time: <strong>14 minutes</strong></span>
                <span className="font-semibold text-brand-600">GPS + OTP verified visit</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <section className="bg-white border-t border-surface-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-brand-600">Problem Statement</span>
              <h2 className="text-2xl font-bold tracking-tight text-ink">A digital platform for cooperative labour services</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Labour Cooperative Federations have skilled local workers, but without a structured digital marketplace they remain underutilized while private platforms control demand. FlexyWork gives cooperatives a trusted platform for verified household and community services.
              </p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {solutionFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-soft px-3.5 py-3">
                  <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="text-xs font-semibold leading-relaxed text-ink-muted">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Grid */}
      <section className="bg-white border-t border-surface-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Verified cooperative service categories</h2>
              <p className="text-xs text-ink-muted mt-1">Book trusted local workers for homes, apartments, institutions, and community facilities.</p>
            </div>
            <Link href="/explore" className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
              View all services <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.name}
                  href={`/explore?category=${encodeURIComponent(c.name)}`}
                  className="flex flex-col justify-between p-4 border border-surface-border rounded-xl bg-surface-soft hover:bg-white hover:border-brand-300 hover:shadow-2xs transition-all group"
                >
                  <div>
                    <div className="h-9 w-9 rounded-lg bg-white border border-surface-border text-ink flex items-center justify-center mb-3 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-200 transition-colors">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-bold text-xs text-ink group-hover:text-brand-600 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xxs text-ink-muted mt-1 line-clamp-1">{c.role}</p>
                  </div>
                  <span className="text-xxs font-semibold text-brand-600 mt-4 block">
                    {c.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How FlexWork Operates */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl space-y-2 mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-ink">How FlexyWork works</h2>
            <p className="text-xs text-ink-muted">A streamlined workflow for cooperative federations, verified workers, and service customers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-surface-border rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-brand-600">01</span>
              <h3 className="font-bold text-sm text-ink">Register and verify</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Workers register with skills, location, certificates, and federation approval so customers can trust the service provider.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-brand-600">02</span>
              <h3 className="font-bold text-sm text-ink">Book and match</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Customers schedule normal, on-demand, or emergency services. The system matches nearby verified workers by skill and availability.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-xl p-5 space-y-2">
              <span className="text-xs font-black text-brand-600">03</span>
              <h3 className="font-bold text-sm text-ink">Complete, pay, and protect</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Visits use OTP/GPS check-in, digital invoicing, ratings, fair wage payouts, and welfare or insurance tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-stone-900 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-5">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to book trusted services or join as a verified worker?</h2>
          <p className="text-sm text-stone-300 max-w-lg mx-auto">
            Build a cooperative-owned alternative where skilled local workers receive fair wages and customers receive reliable verified service.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-6 py-3 text-xs font-bold transition-all shadow-sm"
            >
              Register as Worker
            </Link>
            <Link
              href="/post-gig"
              className="inline-flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-white rounded-xl px-6 py-3 text-xs font-semibold border border-stone-700 transition-all"
            >
              Book a Service
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
