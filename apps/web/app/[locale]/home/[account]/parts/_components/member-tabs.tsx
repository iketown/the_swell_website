import Link from 'next/link';

import { cn } from '@kit/ui/utils';

type MemberTab = {
  displayName: string;
  href: string;
  isActive: boolean;
};

export function MemberTabs({ members }: { members: MemberTab[] }) {
  return (
    <div
      aria-label="Member parts"
      className="border-border flex max-w-full flex-wrap gap-1 border-b"
      role="tablist"
    >
      {members.map((member) => (
        <Link
          aria-selected={member.isActive}
          className={cn(
            'text-muted-foreground hover:text-foreground -mb-px rounded-t-md border border-transparent px-4 py-2 text-sm font-semibold tracking-normal transition-colors',
            member.isActive
              ? 'border-border border-b-background bg-background text-foreground shadow-sm'
              : 'hover:bg-muted/60',
          )}
          href={member.href}
          key={member.href}
          role="tab"
        >
          {formatTabLabel(member.displayName)}
        </Link>
      ))}
    </div>
  );
}

function formatTabLabel(displayName: string) {
  return displayName.trim().split(/\s+/)[0]?.toUpperCase() ?? displayName;
}
