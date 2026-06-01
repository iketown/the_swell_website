import Image from 'next/image';
import Link from 'next/link';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../_lib/server/swell-workspace.loader';

export const generateMetadata = () => {
  return {
    title: 'Records',
  };
};

export default async function BandAlbumsPage() {
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title="Records"
        description={<AppBreadcrumbs />}
      />

      <div className="grid w-full max-w-6xl gap-4 pb-32 sm:grid-cols-2 xl:grid-cols-3">
        {data.albums.map((album) => {
          const songs = data.songsByAlbumId.get(album.id) ?? [];

          return (
            <Link key={album.id} href={`/band/albums/${album.slug}`}>
              <Card className="hover:border-primary/60 h-full overflow-hidden transition">
                {album.cover_art_url ? (
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    <Image
                      alt={`${album.title} cover`}
                      className="h-full w-full object-cover"
                      fill
                      src={album.cover_art_url}
                      unoptimized
                    />
                  </div>
                ) : null}

                <CardHeader>
                  <CardTitle>{album.title}</CardTitle>
                  <CardDescription>
                    {album.release_year ?? 'Year unknown'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Badge variant="secondary">
                    {songs.length} reference{' '}
                    {songs.length === 1 ? 'song' : 'songs'}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageBody>
  );
}
