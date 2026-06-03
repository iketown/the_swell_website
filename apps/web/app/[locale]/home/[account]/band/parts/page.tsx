import { redirect } from 'next/navigation';

export const generateMetadata = () => {
  return {
    title: 'Parts',
  };
};

export default function BandPartsPage() {
  redirect('/band/parts');
}
