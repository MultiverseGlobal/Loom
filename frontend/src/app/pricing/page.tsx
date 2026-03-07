"use client";

import { LandingNav } from '@/components/landing/LandingNav';
import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { PRICING_PLANS } from '@/config/pricing';
import { authService } from '@/services/auth.service';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PricingPage() {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleUpgrade = async (plan: typeof PRICING_PLANS[0]) => {
        alert("Billing is currently under maintenance. We are moving to Polar.sh! Stay tuned.");
    };

    return (
        <div className="min-h-screen">
            <LandingNav />

            {/* Hero */}
            <section className="pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-[48px] font-bold text-[var(--text-primary)] mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-[18px] text-[var(--text-secondary)] mb-8">
                        Choose the plan that's right for you. Upgrade, downgrade, or cancel anytime.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-20 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
                    {PRICING_PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-xl border p-8 ${plan.popular
                                ? "border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-glow)]"
                                : "border-[var(--border-default)]"
                                } bg-[var(--bg-panel)]`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-white text-[12px] font-medium">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-[40px] font-bold text-[var(--text-primary)]">
                                        {plan.price}
                                    </span>
                                    <span className="text-[14px] text-[var(--text-secondary)]">
                                        {plan.period}
                                    </span>
                                </div>
                                <p className="text-[14px] text-[var(--text-secondary)]">
                                    {plan.description}
                                </p>
                            </div>

                            <button
                                onClick={() => handleUpgrade(plan)}
                                disabled={loadingId === plan.id}
                                className={`block w-full text-center px-4 py-3 rounded-lg font-medium text-[14px] mb-6 transition-opacity ${plan.popular
                                    ? "bg-[var(--accent-primary)] text-white hover:opacity-90"
                                    : "border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                                    } ${loadingId === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {loadingId === plan.id ? 'Processing...' : (plan.price === "$0" ? "Get Started" : `Subscribe to ${plan.name}`)}
                            </button>

                            <div className="space-y-3">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        {feature.included ? (
                                            <Check size={16} className="text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <X size={16} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                                        )}
                                        <span className={`text-[14px] ${feature.included ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                                            {feature.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            {/* Enterprise CTA */}
            <div className="max-w-4xl mx-auto px-6 pb-20 text-center">
                <div className="p-8 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                        Need a custom solution?
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-8">
                        We offer tailored plans for large teams and enterprises with specific security and compliance requirements.
                    </p>
                    <Link href="/contact" className="inline-block px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-root)] font-medium rounded-lg hover:opacity-90 transition-opacity">
                        Contact Sales
                    </Link>
                </div>
            </div>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-6 pb-32">
                <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Can I switch plans later?</h3>
                        <p className="text-[var(--text-secondary)]">Yes, you can upgrade or downgrade your plan at any time. Changes will take effect immediately.</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">How does the free trial work?</h3>
                        <p className="text-[var(--text-secondary)]">You get 14 days of full access to the Pro plan. No credit card required to start.</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Do you offer refunds?</h3>
                        <p className="text-[var(--text-secondary)]">We offer a 30-day money-back guarantee if you're not satisfied with Loom AI.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
