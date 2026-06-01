'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { Search } from 'lucide-react';

import { Input } from '@kit/ui/input';
import { cn } from '@kit/ui/utils';

interface PartsSongSearchProps {
  songs: Array<{
    artist: string | null;
    partCount: number;
    slug: string;
    title: string;
  }>;
}

export function PartsSongSearch({ songs }: PartsSongSearchProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearch(query);
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return songs.slice(0, 8);
    }

    return songs
      .filter((song) => {
        const haystack = normalizeSearch(
          `${song.title} ${song.artist ?? ''} ${song.slug}`,
        );

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, songs]);

  return (
    <div className="relative max-w-2xl">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        aria-label="Search songs"
        className="pl-9"
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search songs..."
        type="search"
        value={query}
      />

      {query.trim() ? (
        <div className="bg-popover text-popover-foreground absolute z-20 mt-2 w-full overflow-hidden rounded-lg border shadow-lg">
          {results.length > 0 ? (
            results.map((song) => (
              <Link
                key={song.slug}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground flex items-center justify-between gap-3 px-3 py-2.5 text-sm outline-none',
                )}
                href={`/band/parts/${song.slug}/parts`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {song.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {song.artist ?? 'The Beach Boys'}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {song.partCount} {song.partCount === 1 ? 'part' : 'parts'}
                </span>
              </Link>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-3 text-sm">
              No songs found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
