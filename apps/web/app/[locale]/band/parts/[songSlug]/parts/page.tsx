import { redirect } from 'next/navigation';

interface LegacySongPartsPageProps {
  params: Promise<{ songSlug: string }>;
}

export default async function LegacySongPartsPage({
  params,
}: LegacySongPartsPageProps) {
  const { songSlug } = await params;

  redirect(`/band/parts/${songSlug}`);
}
