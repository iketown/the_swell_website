import type { Metadata } from 'next';

import { WaveLab } from './_components/wave-lab';

export const metadata: Metadata = {
  title: 'Wave Lab',
  description: 'Three.js wave surface experiment for The Swell.',
};

export default function WavesPage() {
  return <WaveLab />;
}
