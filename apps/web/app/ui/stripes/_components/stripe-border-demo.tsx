"use client";

import { useCallback, useMemo, useState } from "react";

import { Leva, useControls } from "leva";

import {
  DEFAULT_STRIPED_BORDER_COLORS,
  STRIPED_BORDER_DEFAULTS,
  STRIPED_BORDER_EASING,
  StripedBorder,
} from "../../_components/striped-border";

const BAND_ORDER = ["orange-card-border", "teal", "brown"];
const LEVA_DARK_THEME = {
  colors: {
    accent1: "#68c7c1",
    accent2: "#f57f5b",
    accent3: "#faca78",
    folderTextColor: "#fffaf0",
    folderWidgetColor: "#68c7c1",
    highlight1: "#fffaf0",
    highlight2: "#f3e9d6",
    highlight3: "#8fd0e0",
    vivid1: "#f57f5b",
  },
  fonts: {
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  radii: {
    lg: "8px",
    sm: "4px",
    xs: "3px",
  },
  sizes: {
    controlWidth: "124px",
    rowHeight: "28px",
  },
};

const STRIPE_CARDS = [
  {
    eyebrow: "Card 01",
    title: "Center line leads the phrase.",
    body: "The orange anchor draws first, with brown and teal following as delayed echoes.",
  },
  {
    eyebrow: "Card 02",
    title: "Trigger, then play.",
    body: "Each frame animates in at the trigger line, then reverses when it crosses back out.",
  },
  {
    eyebrow: "Card 03",
    title: "Borders behave like notation.",
    body: "The same component can move from this lab into campaign cards or show blocks.",
  },
  {
    eyebrow: "Card 04",
    title: "Ready for color variations.",
    body: "The behavior stays intact while the three stripe colors can change per surface.",
  },
];

export function StripeBorderDemo() {
  const [copyStatus, setCopyStatus] = useState("Copy values");
  const { bandWidth, bandGap, chaseDelay, duration, radius, triggerY } =
    useControls("Stripe Border", {
      bandWidth: {
        value: STRIPED_BORDER_DEFAULTS.bandWidth,
        min: 1,
        max: 18,
        step: 1,
        label: "Band width",
      },
      bandGap: {
        value: STRIPED_BORDER_DEFAULTS.bandGap,
        min: 0,
        max: 28,
        step: 1,
        label: "Space between bands",
      },
      radius: {
        value: STRIPED_BORDER_DEFAULTS.radius,
        min: 0,
        max: 120,
        step: 1,
        label: "Radius",
      },
      chaseDelay: {
        value: STRIPED_BORDER_DEFAULTS.chaseDelay,
        min: 0,
        max: 45,
        step: 1,
        label: "Chase delay %",
      },
      duration: {
        value: STRIPED_BORDER_DEFAULTS.duration,
        min: 0.1,
        max: 4,
        step: 0.1,
        label: "Duration",
      },
      triggerY: {
        value: STRIPED_BORDER_DEFAULTS.triggerY,
        min: 10,
        max: 90,
        step: 1,
        label: "Trigger Y",
      },
    });

  const copiedValues = useMemo(
    () => ({
      bandWidth,
      bandGap,
      chaseDelay,
      colors: DEFAULT_STRIPED_BORDER_COLORS,
      duration,
      easing: STRIPED_BORDER_EASING,
      radius,
      bandOrder: BAND_ORDER,
      trigger: `center ${triggerY}%`,
      triggerY,
    }),
    [bandGap, bandWidth, chaseDelay, duration, radius, triggerY],
  );

  const handleCopyValues = useCallback(async () => {
    const values = JSON.stringify(copiedValues, null, 2);

    try {
      await navigator.clipboard.writeText(values);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus("Copy values"), 1600);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus("Copy values"), 1600);
    }
  }, [copiedValues]);

  return (
    <>
      <Leva collapsed={false} theme={LEVA_DARK_THEME} />
      <div className="stripe-border-demo__toolbar">
        <button type="button" onClick={handleCopyValues}>
          {copyStatus}
        </button>
      </div>
      <div className="stripe-border-demo__stack">
        {STRIPE_CARDS.map((card) => (
          <StripedBorder
            bandGap={bandGap}
            bandWidth={bandWidth}
            chaseDelay={chaseDelay}
            contentClassName="stripe-border-demo__card"
            duration={duration}
            key={card.eyebrow}
            radius={radius}
            triggerY={triggerY}
          >
            <p className="stripe-border-demo__eyebrow">{card.eyebrow}</p>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </StripedBorder>
        ))}
      </div>
      <style jsx>{`
        .stripe-border-demo__toolbar {
          width: min(100%, 42rem);
          display: flex;
          justify-content: flex-end;
        }

        .stripe-border-demo__toolbar button {
          appearance: none;
          border: 1.5px solid var(--swell-brown-dark);
          border-radius: 8px;
          background: var(--swell-paper-light);
          box-shadow: 0 3px 0 var(--swell-brown-dark);
          color: var(--swell-brown-dark);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          padding: 0.58rem 0.78rem;
          text-transform: uppercase;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .stripe-border-demo__toolbar button:hover {
          transform: translateY(1px);
          box-shadow: 0 2px 0 var(--swell-brown-dark);
        }

        .stripe-border-demo__toolbar button:active {
          transform: translateY(3px);
          box-shadow: none;
        }

        .stripe-border-demo__toolbar button:focus-visible {
          outline: 3px solid var(--swell-mustard);
          outline-offset: 3px;
        }

        .stripe-border-demo__stack {
          width: min(100%, 42rem);
          display: grid;
          gap: clamp(6rem, 16vh, 12rem);
          padding: 18vh 0 38vh;
        }
      `}</style>
      <style jsx global>{`
        .stripe-border-demo__card {
          min-height: 18rem;
          display: grid;
          align-content: center;
          gap: 1rem;
          padding: clamp(1.35rem, 4vw, 2.5rem);
        }

        .stripe-border-demo__eyebrow {
          margin: 0;
          color: var(--swell-teal-dark);
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .stripe-border-demo__card h2 {
          max-width: 12ch;
          margin: 0;
          font-family: var(--swell-font-display);
          font-size: clamp(2.6rem, 1.9rem + 4vw, 5.8rem);
          font-weight: 400;
          line-height: 0.92;
          text-wrap: balance;
        }

        .stripe-border-demo__card p:not(.stripe-border-demo__eyebrow) {
          max-width: 36rem;
          margin: 0;
          color: var(--swell-muted);
          font-size: 1.04rem;
          line-height: 1.7;
        }

        [class*="leva-"] label,
        [class*="leva-"] label *,
        [class*="leva-"] [title^="Click to copy"] {
          color: #fffaf0 !important;
          fill: #fffaf0 !important;
        }
      `}</style>
    </>
  );
}
