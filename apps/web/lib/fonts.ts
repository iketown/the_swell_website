import { Caprasimo as DisplayFont, Inter as SansFont } from 'next/font/google';

import { cn } from '@kit/ui/utils';

/**
 * @sans
 * @description Define here the sans font.
 * By default, it uses the Inter font from Google Fonts.
 */
const sans = SansFont({
  subsets: ['latin'],
  variable: '--font-sans-fallback',
  fallback: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial'],
  preload: true,
  weight: ['300', '400', '500', '600', '700'],
});

/**
 * @heading
 * @description Define here the heading font.
 */
const heading = sans;

/**
 * @display
 * @description Retro display font for The Swell card titles.
 */
const display = DisplayFont({
  subsets: ['latin'],
  variable: '--font-swell-display',
  fallback: ['Cooper Black', 'Bookman Old Style', 'Georgia', 'serif'],
  preload: true,
  weight: ['400'],
});

// we export these fonts into the root layout
export { sans, heading, display };

/**
 * @name getFontsClassName
 * @description Get the class name for the root layout.
 * @param theme
 */
export function getFontsClassName(theme?: string) {
  const dark = theme === 'dark';
  const light = !dark;

  const font = [sans.variable, heading.variable, display.variable].reduce<
    string[]
  >(
    (acc, curr) => {
      if (acc.includes(curr)) return acc;

      return [...acc, curr];
    },
    [],
  );

  return cn(...font, {
    dark,
    light,
  });
}
