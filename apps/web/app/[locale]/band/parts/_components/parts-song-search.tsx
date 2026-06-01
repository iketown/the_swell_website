'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuRect, setMenuRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const inputShellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = normalizeSearch(query);
  const showResults = open;
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return songs;
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

  const updateMenuRect = useCallback(() => {
    const shell = inputShellRef.current;

    if (!shell) {
      return;
    }

    const rect = shell.getBoundingClientRect();

    setMenuRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!showResults) {
      setHighlightedIndex(-1);
      return;
    }

    updateMenuRect();

    window.addEventListener('resize', updateMenuRect);
    window.addEventListener('scroll', updateMenuRect, true);

    return () => {
      window.removeEventListener('resize', updateMenuRect);
      window.removeEventListener('scroll', updateMenuRect, true);
    };
  }, [showResults, updateMenuRect]);

  useEffect(() => {
    if (highlightedIndex >= results.length) {
      setHighlightedIndex(results.length - 1);
    }
  }, [highlightedIndex, results.length]);

  useEffect(() => {
    if (!showResults) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        inputShellRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showResults]);

  function navigateToSong(index: number) {
    const song = results[index];

    if (!song) {
      return;
    }

    setOpen(false);
    router.push(`/band/parts/${song.slug}`);
  }

  return (
    <>
      <div className="relative max-w-2xl" ref={inputShellRef}>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-activedescendant={
            highlightedIndex >= 0
              ? `parts-song-search-${results[highlightedIndex]?.slug}`
              : undefined
          }
          aria-label="Search songs"
          aria-controls="parts-song-search-results"
          aria-expanded={showResults}
          autoComplete="off"
          className="pl-9"
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!showResults) {
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightedIndex((current) =>
                Math.min(current + 1, results.length - 1),
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightedIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && highlightedIndex >= 0) {
              event.preventDefault();
              navigateToSong(highlightedIndex);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Search songs..."
          role="combobox"
          type="search"
          value={query}
        />
      </div>

      {showResults && menuRect
        ? createPortal(
            <div
              className="bg-popover text-popover-foreground fixed z-50 max-h-72 overflow-hidden rounded-lg border shadow-lg"
              id="parts-song-search-results"
              onMouseDown={(event) => event.preventDefault()}
              ref={menuRef}
              role="listbox"
              style={{
                left: menuRect.left,
                top: menuRect.top,
                width: menuRect.width,
              }}
            >
              <div className="flex max-h-72 flex-col overflow-auto">
                {results.length > 0 ? (
                  results.map((song, index) => {
                    const highlighted = index === highlightedIndex;

                    return (
                      <button
                        className={cn(
                          'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm outline-none',
                          highlighted && 'bg-accent text-accent-foreground',
                        )}
                        id={`parts-song-search-${song.slug}`}
                        key={song.slug}
                        onClick={() => navigateToSong(index)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        role="option"
                        type="button"
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
                          {song.partCount}{' '}
                          {song.partCount === 1 ? 'part' : 'parts'}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground px-3 py-3 text-sm">
                    No songs found.
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
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
