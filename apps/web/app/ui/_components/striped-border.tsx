"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type StripedBorderStyle = CSSProperties &
  Record<"--stripe-width" | "--stripe-gap" | "--stripe-radius", string>;

export interface StripedBorderColors {
  center: string;
  inner: string;
  outer: string;
}

export interface StripedBorderProps {
  ariaLabel?: string;
  bandGap?: number;
  bandWidth?: number;
  chaseDelay?: number;
  children: ReactNode;
  className?: string;
  colors?: Partial<StripedBorderColors>;
  contentClassName?: string;
  duration?: number;
  id?: string;
  in?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  radius?: number;
  triggerY?: number;
}

export const STRIPED_BORDER_EASING = "fastInStrongOut";

export const DEFAULT_STRIPED_BORDER_COLORS: StripedBorderColors = {
  center: "var(--swell-orange)",
  inner: "var(--swell-teal)",
  outer: "var(--swell-brown)",
};

export const STRIPED_BORDER_DEFAULTS = {
  bandGap: 4,
  bandWidth: 4,
  chaseDelay: 15,
  duration: 3.5,
  radius: 56,
  triggerY: 80,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(value, 1));
}

function easeFastInStrongOut(value: number) {
  const t = clamp01(value);
  const easeInCutoff = 0.32;
  const easedAtCutoff = 0.42;

  if (t < easeInCutoff) {
    const localProgress = t / easeInCutoff;

    return easedAtCutoff * localProgress * localProgress;
  }

  const localProgress = (t - easeInCutoff) / (1 - easeInCutoff);

  return (
    easedAtCutoff + (1 - easedAtCutoff) * (1 - Math.pow(1 - localProgress, 4))
  );
}

function getRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x + r} ${y}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${bottom - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function getDelayedBandProgress(
  animationProgress: number,
  chaseProgress: number,
  bandIndex: number,
) {
  const drawDuration = 1 - chaseProgress * 2;
  const localProgress = clamp01(
    (animationProgress - chaseProgress * bandIndex) / drawDuration,
  );

  return easeFastInStrongOut(localProgress);
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function StripedBorder({
  ariaLabel,
  bandGap = STRIPED_BORDER_DEFAULTS.bandGap,
  bandWidth = STRIPED_BORDER_DEFAULTS.bandWidth,
  chaseDelay = STRIPED_BORDER_DEFAULTS.chaseDelay,
  children,
  className,
  colors,
  contentClassName,
  duration = STRIPED_BORDER_DEFAULTS.duration,
  id,
  in: isIn,
  onMouseEnter,
  onMouseLeave,
  radius = STRIPED_BORDER_DEFAULTS.radius,
  triggerY = STRIPED_BORDER_DEFAULTS.triggerY,
}: StripedBorderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const outerPathRef = useRef<SVGPathElement>(null);
  const centerPathRef = useRef<SVGPathElement>(null);
  const innerPathRef = useRef<SVGPathElement>(null);
  const progressRef = useRef({ value: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [frameSize, setFrameSize] = useState({ height: 0, width: 0 });
  const resolvedColors = {
    ...DEFAULT_STRIPED_BORDER_COLORS,
    ...colors,
  };

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const updateFrameSize = () => {
      setFrameSize({
        height: frame.clientHeight,
        width: frame.clientWidth,
      });
    };

    updateFrameSize();

    const resizeObserver = new ResizeObserver(updateFrameSize);
    resizeObserver.observe(frame);

    return () => resizeObserver.disconnect();
  }, []);

  const stripePaths = useMemo(() => {
    const { height, width } = frameSize;

    if (height <= 0 || width <= 0) {
      return null;
    }

    const step = bandWidth + bandGap;
    const outerInset = bandWidth / 2;
    const centerInset = step + bandWidth / 2;
    const innerInset = step + bandWidth + bandGap + bandWidth / 2;

    const createPath = (inset: number, pathRadius: number) =>
      getRoundedRectPath(
        inset,
        inset,
        width - inset * 2,
        height - inset * 2,
        pathRadius,
      );

    return {
      center: createPath(centerInset, radius),
      inner: createPath(innerInset, radius - step),
      outer: createPath(outerInset, radius + step),
    };
  }, [bandGap, bandWidth, frameSize, radius]);

  const applyAnimationProgress = useCallback(
    (animationProgress: number) => {
      const chaseProgress = Math.max(0, Math.min(chaseDelay / 100, 0.45));
      const centerProgress = getDelayedBandProgress(
        animationProgress,
        chaseProgress,
        0,
      );
      const innerProgress = getDelayedBandProgress(
        animationProgress,
        chaseProgress,
        1,
      );
      const outerProgress = getDelayedBandProgress(
        animationProgress,
        chaseProgress,
        2,
      );

      progressRef.current.value = animationProgress;
      centerPathRef.current?.setAttribute(
        "stroke-dashoffset",
        String(1 - centerProgress),
      );
      innerPathRef.current?.setAttribute(
        "stroke-dashoffset",
        String(1 - innerProgress),
      );
      outerPathRef.current?.setAttribute(
        "stroke-dashoffset",
        String(1 - outerProgress),
      );
    },
    [chaseDelay],
  );

  const animateToProgress = useCallback(
    (targetProgress: number) => {
      tweenRef.current?.kill();
      tweenRef.current = gsap.to(progressRef.current, {
        duration,
        ease: "power2.inOut",
        onUpdate: () => applyAnimationProgress(progressRef.current.value),
        overwrite: true,
        value: targetProgress,
      });
    },
    [applyAnimationProgress, duration],
  );

  useEffect(() => {
    if (typeof isIn !== "boolean" || !stripePaths) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotionQuery.matches) {
      applyAnimationProgress(isIn ? 1 : 0);
      return;
    }

    animateToProgress(isIn ? 1 : 0);
  }, [animateToProgress, applyAnimationProgress, isIn, stripePaths]);

  useEffect(() => {
    const frame = frameRef.current;

    if (typeof isIn === "boolean" || !frame || !stripePaths) {
      return;
    }

    const isPastTrigger = () => {
      const rect = frame.getBoundingClientRect();
      const frameCenterY = rect.top + rect.height / 2;
      const triggerPointY = window.innerHeight * (triggerY / 100);

      return frameCenterY <= triggerPointY;
    };

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotionQuery.matches) {
      applyAnimationProgress(1);
      return;
    }

    applyAnimationProgress(isPastTrigger() ? 1 : 0);

    const trigger = ScrollTrigger.create({
      trigger: frame,
      start: () => `center ${triggerY}%`,
      invalidateOnRefresh: true,
      onEnter: () => animateToProgress(1),
      onLeaveBack: () => animateToProgress(0),
      onRefresh: () => applyAnimationProgress(isPastTrigger() ? 1 : 0),
    });

    ScrollTrigger.refresh();

    return () => {
      tweenRef.current?.kill();
      trigger.kill();
    };
  }, [animateToProgress, applyAnimationProgress, isIn, stripePaths, triggerY]);

  return (
    <div
      aria-label={ariaLabel}
      className={joinClassNames("striped-border", className)}
      id={id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={frameRef}
      style={
        {
          "--stripe-width": `${bandWidth}px`,
          "--stripe-gap": `${bandGap}px`,
          "--stripe-radius": `${radius}px`,
        } as StripedBorderStyle
      }
    >
      {stripePaths ? (
        <svg
          aria-hidden="true"
          className="striped-border__paths"
          focusable="false"
          preserveAspectRatio="none"
          viewBox={`0 0 ${frameSize.width} ${frameSize.height}`}
        >
          <path
            d={stripePaths.outer}
            fill="none"
            pathLength={1}
            ref={outerPathRef}
            stroke={resolvedColors.outer}
            strokeDasharray={1}
            strokeDashoffset={1}
            strokeLinecap="butt"
            strokeWidth={bandWidth}
          />
          <path
            d={stripePaths.center}
            fill="none"
            pathLength={1}
            ref={centerPathRef}
            stroke={resolvedColors.center}
            strokeDasharray={1}
            strokeDashoffset={1}
            strokeLinecap="butt"
            strokeWidth={bandWidth}
          />
          <path
            d={stripePaths.inner}
            fill="none"
            pathLength={1}
            ref={innerPathRef}
            stroke={resolvedColors.inner}
            strokeDasharray={1}
            strokeDashoffset={1}
            strokeLinecap="butt"
            strokeWidth={bandWidth}
          />
        </svg>
      ) : null}
      <div className="striped-border__surface">
        <div
          className={joinClassNames(
            "striped-border__content",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
      <style jsx>{`
        .striped-border {
          --stripe-step: calc(var(--stripe-width) + var(--stripe-gap));
          --stripe-field: var(--stripe-step);
          --stripe-outer-radius: calc(
            var(--stripe-radius) + var(--stripe-field)
          );
          width: 100%;
          position: relative;
          isolation: isolate;
          border-radius: var(--stripe-outer-radius);
          padding: var(--stripe-field);
          filter: drop-shadow(0 18px 34px rgba(0, 18, 24, 0.32));
        }

        .striped-border__paths {
          position: absolute;
          inset: 0;
          overflow: visible;
          pointer-events: none;
          z-index: 2;
        }

        .striped-border__surface {
          position: relative;
          overflow: hidden;
          border-radius: var(--stripe-radius);
          color: var(--swell-brown-dark);
          z-index: 1;
        }

        .striped-border__surface::before {
          content: "";
          position: absolute;
          inset: var(--stripe-width);
          border-radius: max(
            0px,
            calc(var(--stripe-radius) - var(--stripe-width))
          );
          background:
            linear-gradient(
              90deg,
              rgba(45, 31, 26, 0.03) 0 1px,
              transparent 1px 3.4rem
            ),
            var(--swell-paper-light);
        }

        .striped-border__content {
          margin: var(--stripe-field);
          position: relative;
        }
      `}</style>
    </div>
  );
}
