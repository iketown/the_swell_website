import type { Metadata } from 'next';

import { WaveLab } from '../ui/waves/_components/wave-lab';

export const metadata: Metadata = {
  title: 'The Swell',
  description: 'The Sun-Drenched harmonies of The Beach Boys, tuned live.',
};

export default function HomePage() {
  return <WaveLab />;
}
