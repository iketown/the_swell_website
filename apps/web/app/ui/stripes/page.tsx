import type { Metadata } from 'next';
import Link from 'next/link';

import { StripeBorderDemo } from './_components/stripe-border-demo';

export const metadata: Metadata = {
  title: 'Stripe Lab',
  description: 'Animated stripe experiments for The Swell.',
};

export default function StripesPage() {
  return (
    <main className="min-h-screen bg-[#003445] px-6 py-10 text-[#f3e9d6]">
      <div className="mx-auto grid max-w-5xl gap-10">
        <Link
          href="/ui"
          className="w-fit rounded-md border border-[#8fd0e0]/35 px-3 py-2 text-sm font-bold text-[#8fd0e0] transition hover:border-[#f3e9d6] hover:text-[#f3e9d6] focus:ring-2 focus:ring-[#f4b43e] focus:outline-none"
        >
          Back to UI
        </Link>

        <section className="grid gap-8">
          <div className="grid gap-3">
            <p className="text-xs font-black tracking-[0.18em] text-[#8fd0e0] uppercase">
              Stripe Lab
            </p>
            <h1 className="max-w-4xl text-4xl leading-none font-black tracking-normal text-[#fff1cf] sm:text-6xl">
              Five-stripe card border
            </h1>
          </div>

          <StripeBorderDemo />
        </section>
      </div>
    </main>
  );
}
