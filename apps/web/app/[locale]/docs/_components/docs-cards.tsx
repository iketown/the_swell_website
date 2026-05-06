import Link from 'next/link';

import { Cms } from '@kit/cms';

export function DocsCards({ cards }: { cards: Cms.ContentItem[] }) {
  const cardsSortedByOrder = [...cards].sort((a, b) => a.order - b.order);

  return (
    <div
      className={
        'grid grid-cols-1 gap-4 pb-24 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
      }
    >
      {cardsSortedByOrder.map((item) => {
        return (
          <DocsCard
            key={item.title}
            title={item.title}
            subtitle={item.description}
            link={{
              url: `/docs/${item.slug}`,
            }}
          />
        );
      })}
    </div>
  );
}

function DocsCard({
  title,
  subtitle,
  children,
  link,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string | null;
  link: { url: string; label?: string };
}>) {
  return (
    <Link href={link.url} className="flex w-full flex-col lg:max-w-md">
      <div
        className={`hover:bg-muted/80 active:bg-muted bg-muted/50 flex grow flex-col gap-y-0.5 rounded p-4`}
      >
        <h3 className="text-secondary-foreground mt-0 text-lg font-medium">
          {title}
        </h3>

        {subtitle && (
          <div className="text-muted-foreground text-sm">
            <p dangerouslySetInnerHTML={{ __html: subtitle }}></p>
          </div>
        )}

        {children && <div className="text-sm">{children}</div>}
      </div>
    </Link>
  );
}
