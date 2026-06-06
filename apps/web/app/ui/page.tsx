import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'UI Experiments',
  description: 'Interactive visual experiments for The Swell.',
};

const EXPERIMENTS = [
  {
    href: '/ui/waves',
    title: 'Waves',
    description: 'Three.js wave surface and sand-scroll landing page study.',
  },
  {
    href: '/ui/stripes',
    title: 'Stripes',
    description: 'Animated stripe experiments for future visual treatments.',
  },
];

export default function UiPage() {
  return (
    <main className="min-h-screen bg-[#f3e9d6] px-6 py-10 text-[#2c2a28]">
      <div className="mx-auto grid max-w-4xl gap-8">
        <header className="grid gap-3">
          <p className="text-xs font-black tracking-[0.18em] text-[#2f8f8a] uppercase">
            The Swell
          </p>
          <h1 className="text-4xl font-black tracking-normal sm:text-6xl">
            UI experiments
          </h1>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2" aria-label="UI experiments">
          {EXPERIMENTS.map((experiment) => (
            <Link
              key={experiment.href}
              href={experiment.href}
              className="rounded-lg border border-[#2c2a28]/25 bg-[#fffaf0] p-5 shadow-[0_14px_34px_rgba(45,31,26,0.08)] transition hover:-translate-y-0.5 hover:border-[#2f8f8a] focus:ring-2 focus:ring-[#f4b43e] focus:outline-none"
            >
              <span className="text-2xl font-black">{experiment.title}</span>
              <span className="mt-2 block text-sm leading-6 text-[#6c5a50]">
                {experiment.description}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
