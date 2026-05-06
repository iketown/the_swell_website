'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@kit/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@kit/ui/drawer';

export function MobileSiteNavigation({
  links,
}: {
  links: {
    path: string;
    label: string;
    variant?: React.ComponentProps<typeof Button>['variant'];
  }[];
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger aria-label={'Open Menu'}>
        <Menu className={'h-8 w-8'} />
      </DrawerTrigger>

      <DrawerContent className={'flex w-full flex-col gap-y-2 px-8! py-8'}>
        <DrawerHeader className={'hidden'}>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>

        {Object.values(links).map((item) => {
          const className = 'flex w-full items-center h-12';

          const variant =
            'variant' in item
              ? (item.variant as React.ComponentProps<typeof Button>['variant'])
              : 'ghost';

          return (
            <Button
              variant={variant}
              key={item.path}
              className={className}
              nativeButton={false}
              onClick={() => setOpen(false)}
              render={
                <Link className={className} href={item.path}>
                  {t(item.label)}
                </Link>
              }
            >
              {t(item.label)}
            </Button>
          );
        })}
      </DrawerContent>
    </Drawer>
  );
}
