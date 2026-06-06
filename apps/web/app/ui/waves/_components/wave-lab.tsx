"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { Leva, useControls } from "leva";
import { CalendarDays, ChevronDown, MapPin, Play, Ticket } from "lucide-react";
import * as THREE from "three";

import { StripedBorder } from "../../_components/striped-border";

gsap.registerPlugin(ScrollToPlugin);

const CLOUD_SKY = "#003445";
const OCEAN_COLORS = [
  "#3ee885",
  "#31c996",
  "#14b8a6",
  "#5bd7d2",
  "#8fd0e0",
  "#58b8ee",
  "#1f7fe5",
  "#0f4fa8",
  "#a9edf0",
  "#f4b43e",
  "#fff8df",
  "#d7c69d",
];
const CAN_TUNE_WAVES = process.env.NODE_ENV === "development";
const SAND_SCROLL_DURATION_SECONDS = 0.75;
const SAND_SCROLL_OVERSHOOT_PX = 10;
const SHOW_DATES = [
  {
    date: "Jun 28",
    venue: "Moonlight Beach Amphitheater",
    location: "Encinitas, CA",
    note: "Outdoor summer set",
  },
  {
    date: "Jul 12",
    venue: "The Citrus Room",
    location: "Pasadena, CA",
    note: "All ages matinee",
  },
  {
    date: "Aug 03",
    venue: "Harbor Park Bandshell",
    location: "Ventura, CA",
    note: "Golden hour show",
  },
];

const SETLIST_MOMENTS = [
  {
    title: "Beach Boys band alumni",
    body: "Players with first-hand roots in the Beach Boys world bring the music home with authority, warmth, and care.",
  },
  {
    title: "Pristine live harmonies",
    body: "Falsetto shimmer, stacked vocals, and the clean blend that makes every chorus feel wide open.",
  },
  {
    title: "An immersive summer show",
    body: "A full-band tribute built around the sound, visuals, and golden-hour feel of California pop.",
  },
];

type WaveMode = "stripes" | "dots" | "both";
type StripeOrientation = "east-west" | "north-south";
type ViewMode = "dev" | "user";

interface HighlightStripedCardProps {
  body: string;
  index: number;
  title: string;
}

interface WaveSettings {
  amplitude: number;
  frequency: number;
  speed: number;
  chop: number;
  swell: number;
  direction: number;
  stripes: number;
  samples: number;
  dotRows: number;
  dotColumns: number;
  dotSize: number;
  width: number;
  depth: number;
  pitch: number;
  yaw: number;
  roll: number;
  cameraX: number;
  cameraZ: number;
  cameraY: number;
  cameraFov: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  scrollPreZ: number;
  scrollIntroDuration: number;
  scrollMaxZ: number;
  scrollMinZ: number;
  scrollDamping: number;
  mode: WaveMode;
  fade: number;
  backgroundColor: string;
  dotWander: number;
  dotWanderSpeed: number;
  dotFlow: number;
}

interface WaveSnapshot {
  settings: WaveSettings & {
    stripeOrientation: StripeOrientation;
    viewMode: ViewMode;
  };
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov: number;
    zoom: number;
  };
}

export function WaveLab() {
  const snapshotRef = useRef<WaveSnapshot | null>(null);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const [stripeOrientation, setStripeOrientation] =
    useState<StripeOrientation>("north-south");
  const [viewMode, setViewMode] = useState<ViewMode>("user");
  const [devControlsOpen, setDevControlsOpen] = useState(false);
  const [waveSceneReady, setWaveSceneReady] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const settings = useControls({
    mode: {
      label: "Display",
      options: ["stripes", "dots", "both"] satisfies WaveMode[],
      value: "dots" satisfies WaveMode,
    },
    backgroundColor: {
      label: "Background color",
      value: CLOUD_SKY,
    },
    amplitude: {
      label: "Wave height",
      value: 4,
      min: 0,
      max: 4,
      step: 0.05,
    },
    frequency: {
      label: "Wave spacing",
      value: 0.31,
      min: 0.1,
      max: 2.2,
      step: 0.01,
    },
    speed: { label: "Wave speed", value: 0.4, min: 0, max: 3, step: 0.01 },
    chop: {
      label: "Crest sharpness",
      value: 0.78,
      min: 0,
      max: 1.5,
      step: 0.01,
    },
    swell: {
      label: "Cross swell",
      value: 2.03,
      min: 0,
      max: 4,
      step: 0.01,
    },
    direction: {
      label: "Flow direction",
      value: 270,
      min: 0,
      max: 360,
      step: 1,
    },
    stripes: {
      label: "Stripe count",
      value: 70,
      min: 8,
      max: 120,
      step: 1,
    },
    samples: {
      label: "Stripe detail",
      value: 197,
      min: 32,
      max: 320,
      step: 1,
    },
    dotRows: { label: "Dot rows", value: 117, min: 8, max: 120, step: 1 },
    dotColumns: {
      label: "Dots per row",
      value: 220,
      min: 16,
      max: 220,
      step: 1,
    },
    dotSize: {
      label: "Dot size",
      value: 0.23,
      min: 0.01,
      max: 0.5,
      step: 0.005,
    },
    dotWander: {
      label: "Dot wander",
      value: 0.7,
      min: 0,
      max: 1.6,
      step: 0.01,
    },
    dotWanderSpeed: {
      label: "Dot motion speed",
      value: 0.57,
      min: 0,
      max: 2,
      step: 0.01,
    },
    dotFlow: {
      label: "Dot flow offset",
      value: 2,
      min: -2,
      max: 2,
      step: 0.01,
    },
    width: {
      label: "Plane width",
      value: 90,
      min: 8,
      max: 120,
      step: 0.5,
    },
    depth: {
      label: "Plane depth",
      value: 70,
      min: 8,
      max: 70,
      step: 0.5,
    },
    pitch: {
      label: "Plane pitch",
      value: 0,
      min: -88,
      max: 88,
      step: 1,
    },
    yaw: { label: "Plane yaw", value: 0, min: -40, max: 40, step: 1 },
    roll: { label: "Plane roll", value: 0, min: -20, max: 20, step: 1 },
    cameraX: {
      label: "Camera left/right",
      value: 0.22,
      min: -30,
      max: 30,
      step: 0.25,
    },
    cameraZ: {
      label: "Camera height",
      value: 5.4335,
      min: -8,
      max: 28,
      step: 0.25,
    },
    cameraY: {
      label: "Camera shore/depth",
      value: -34.7393,
      min: -48,
      max: 36,
      step: 0.5,
    },
    cameraFov: {
      label: "Camera lens",
      value: 59,
      min: 20,
      max: 90,
      step: 1,
    },
    targetX: {
      label: "Look target X",
      value: 0,
      min: -16,
      max: 16,
      step: 0.25,
    },
    targetY: {
      label: "Look target Y",
      value: 5.5,
      min: -30,
      max: 38,
      step: 0.25,
    },
    targetZ: {
      label: "Look target Z",
      value: -17,
      min: -20,
      max: 20,
      step: 0.25,
    },
    scrollPreZ: {
      label: "Scroll pre Z",
      value: 30,
      min: 0,
      max: 42,
      step: 0.25,
    },
    scrollIntroDuration: {
      label: "Scroll intro duration",
      value: 4,
      min: 0.2,
      max: 6,
      step: 0.1,
    },
    scrollMaxZ: {
      label: "Scroll max Z",
      value: 8,
      min: -20,
      max: 28,
      step: 0.25,
    },
    scrollMinZ: {
      label: "Scroll min Z",
      value: 2,
      min: -28,
      max: 20,
      step: 0.25,
    },
    scrollDamping: {
      label: "Scroll damping",
      value: 0.9,
      min: 0.1,
      max: 12,
      step: 0.1,
    },
    fade: {
      label: "Distance fade",
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
    },
  }) as WaveSettings;

  const copyValues = useCallback(async () => {
    const snapshot = snapshotRef.current;

    if (!snapshot) {
      setCopyStatus("error");
      return;
    }

    const payload = {
      copiedAt: new Date().toISOString(),
      ...snapshot,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("error");
    }
  }, []);

  const showDevControls = CAN_TUNE_WAVES && devControlsOpen;
  const isDev = showDevControls && viewMode === "dev";
  const scrollProgressRef = useScrollProgress(!isDev);
  const heroSceneVisible = useHeroSceneVisibility(!isDev);
  const logoParallaxY = useLogoParallax(!isDev);
  const sandParallaxRef = useSandParallax(!isDev && waveSceneReady);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const restoreScrollBehaviorRef = useRef<(() => void) | null>(null);
  const handleWaveSceneReady = useCallback(() => {
    setWaveSceneReady(true);
  }, []);
  const handleScrollToHome = useCallback(() => {
    const section = document.querySelector<HTMLElement>(".waves-sand-section");

    if (!section) {
      return;
    }

    scrollTweenRef.current?.kill();
    restoreScrollBehaviorRef.current?.();

    const startY = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = THREE.MathUtils.clamp(
      startY + section.getBoundingClientRect().top + SAND_SCROLL_OVERSHOOT_PX,
      0,
      Math.max(maxY, 0),
    );
    const restoreScrollBehavior = forceInstantScrollBehavior();

    restoreScrollBehaviorRef.current = restoreScrollBehavior;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, targetY);
      restoreScrollBehavior();
      restoreScrollBehaviorRef.current = null;
      return;
    }

    const startTime = performance.now();
    const firstProgress = 0.045;

    window.scrollTo(0, THREE.MathUtils.lerp(startY, targetY, firstProgress));

    scrollTweenRef.current = gsap.to(window, {
      duration: SAND_SCROLL_DURATION_SECONDS,
      ease: "power2.out",
      overwrite: true,
      scrollTo: {
        y: targetY,
        autoKill: false,
      },
      onComplete: () => {
        restoreScrollBehavior();
        restoreScrollBehaviorRef.current = null;
        scrollTweenRef.current = null;
      },
      onInterrupt: () => {
        restoreScrollBehavior();
        restoreScrollBehaviorRef.current = null;
        scrollTweenRef.current = null;
      },
      onUpdate: () => {
        if (performance.now() - startTime < 80 && window.scrollY === startY) {
          window.scrollTo(
            0,
            THREE.MathUtils.lerp(startY, targetY, firstProgress),
          );
        }
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      scrollTweenRef.current?.kill();
      restoreScrollBehaviorRef.current?.();
    };
  }, []);

  return (
    <main
      className={
        isDev
          ? "fixed inset-0 h-screen w-screen overflow-hidden text-slate-100"
          : "relative min-h-screen overflow-x-hidden text-slate-100"
      }
      style={{
        backgroundColor: isDev
          ? "#030706"
          : waveSceneReady
            ? "#f3e9d6"
            : CLOUD_SKY,
      }}
    >
      {isDev ? (
        <div className="absolute left-5 top-4 z-30">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/70">
            The Swell
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-normal text-slate-50">
            Wave Lab
          </h1>
        </div>
      ) : null}
      {CAN_TUNE_WAVES && !showDevControls ? (
        <button
          type="button"
          onClick={() => setDevControlsOpen(true)}
          className="absolute right-5 top-4 z-30 rounded-md border border-cyan-100/20 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-50/75 shadow-lg shadow-black/20 backdrop-blur transition hover:text-cyan-50"
        >
          Tune waves
        </button>
      ) : null}
      {showDevControls ? (
        <div className="absolute right-[300px] top-4 z-30 flex rounded-lg border border-cyan-100/25 bg-black/35 p-1 text-sm font-semibold text-cyan-50 shadow-lg shadow-black/20 backdrop-blur">
          <button
            type="button"
            onClick={() =>
              setStripeOrientation((current) =>
                current === "east-west" ? "north-south" : "east-west",
              )
            }
            className="rounded-md px-3 py-2 text-cyan-50/75 transition hover:text-cyan-50"
          >
            {stripeOrientation === "east-west" ? "STRIPES E/W" : "STRIPES N/S"}
          </button>
          {(["dev", "user"] satisfies ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={
                viewMode === mode
                  ? "rounded-md bg-[#f3e9d6] px-3 py-2 text-[#2c2a28]"
                  : "rounded-md px-3 py-2 text-cyan-50/75 transition hover:text-cyan-50"
              }
            >
              {mode.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setViewMode("user");
              setDevControlsOpen(false);
            }}
            className="rounded-md px-3 py-2 text-cyan-50/75 transition hover:text-cyan-50"
          >
            HIDE
          </button>
        </div>
      ) : null}
      {isDev ? (
        <div className="absolute left-5 top-24 z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void copyValues()}
            className="rounded-md border border-cyan-200/30 bg-[#f3e9d6] px-3 py-2 text-sm font-semibold text-[#2c2a28] shadow-lg shadow-black/20 transition hover:bg-white focus:ring-2 focus:ring-cyan-200 focus:outline-none"
          >
            Copy values
          </button>
          <span
            aria-live="polite"
            className="text-xs font-medium text-cyan-100/80"
          >
            {copyStatus === "copied"
              ? "Copied JSON"
              : copyStatus === "error"
                ? "Copy failed"
                : "Orbit, then copy"}
          </span>
        </div>
      ) : null}

      <section
        className={
          isDev
            ? "absolute inset-0"
            : heroSceneVisible
              ? "fixed inset-0 h-screen overflow-hidden"
              : "pointer-events-none fixed inset-0 h-screen overflow-hidden opacity-0"
        }
      >
        <div
          className={
            isDev
              ? "absolute inset-0"
              : "absolute inset-0 h-screen overflow-hidden"
          }
        >
          <Canvas
            className="absolute inset-0 h-screen w-screen"
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false }}
            style={{ height: "100vh", width: "100vw" }}
          >
            <color attach="background" args={[settings.backgroundColor]} />
            <fog attach="fog" args={[settings.backgroundColor, 12, 58]} />
            <SceneReadyNotifier onReady={handleWaveSceneReady} />
            <PerspectiveCamera
              makeDefault
              position={[settings.cameraX, settings.cameraY, settings.cameraZ]}
              fov={settings.cameraFov}
            />
            <CameraSnapshotUpdater
              controlsRef={controlsRef}
              isDev={isDev}
              scrollProgressRef={scrollProgressRef}
              settings={settings}
              snapshotRef={snapshotRef}
              stripeOrientation={stripeOrientation}
              viewMode={viewMode}
            />
            <WaveStage
              settings={settings}
              stripeOrientation={stripeOrientation}
            />
            <OrbitControls
              ref={controlsRef}
              enabled={isDev}
              enableDamping
              enablePan={false}
              enableRotate={isDev}
              enableZoom={isDev}
              dampingFactor={0.08}
              minDistance={8}
              maxDistance={58}
              target={[settings.targetX, settings.targetY, settings.targetZ]}
            />
          </Canvas>
          {!isDev && !waveSceneReady ? (
            <div
              className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-cyan-50/70"
              role="status"
              aria-live="polite"
              aria-label="Loading wave scene"
            >
              <span className="waves-loading-dot" aria-hidden="true" />
            </div>
          ) : null}
          {!isDev && waveSceneReady ? (
            <div
              className="pointer-events-none absolute inset-0 grid place-items-center px-6 will-change-transform"
              style={{
                transform: `translate3d(0, ${logoParallaxY}px, 0)`,
              }}
            >
              <div className="pointer-events-auto flex flex-col items-center gap-7">
                <Image
                  src="/images/swell_logo_horizontal_stripes.svg"
                  alt="The Swell"
                  width={8192}
                  height={3680}
                  priority
                  unoptimized
                  className="w-[min(72vw,760px)] drop-shadow-[0_16px_34px_rgba(0,0,0,0.46)]"
                />
                <button
                  type="button"
                  className="waves-logo-scroll-button"
                  onClick={handleScrollToHome}
                  aria-label="Scroll to main content"
                >
                  <ChevronDown aria-hidden="true" size={26} strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!isDev && waveSceneReady ? (
        <section className="waves-sand-section relative z-20 mt-[100vh] px-6 py-16 text-[#2c2a28]">
          <div
            ref={sandParallaxRef}
            className="waves-sand-texture"
            aria-hidden="true"
          />
          <div className="waves-sand-wash" aria-hidden="true" />
          <div className="waves-home relative z-10 mx-auto grid max-w-6xl gap-10">
            <StripedBorder
              contentClassName="waves-video-feature grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-stretch"
            >
              <div className="waves-video-placeholder">
                <div className="waves-video-screen">
                  <button
                    type="button"
                    className="waves-play-button"
                    aria-label="Play video"
                  >
                    <Play aria-hidden="true" size={30} fill="currentColor" />
                  </button>
                  <div className="waves-video-caption">
                    <span>Live video placeholder</span>
                    <span>16:9</span>
                  </div>
                </div>
              </div>

              <div className="waves-feature-copy">
                <p className="waves-kicker">The sound of summer, tuned live</p>
                <h2>The Sun-Drenched harmonies of The Beach Boys</h2>
                <p>
                  The Swell brings the golden California songbook to stages,
                  parks, private events, and anywhere a room wants to become a
                  chorus.
                </p>
                <div className="waves-action-row">
                  <a data-slot="button" className="bg-primary" href="#shows">
                    <Ticket aria-hidden="true" size={18} />
                    See shows
                  </a>
                  <a data-slot="button" href="#booking">
                    <Play aria-hidden="true" size={18} />
                    Watch reel
                  </a>
                </div>
              </div>
            </StripedBorder>

            <section className="waves-home-grid" aria-label="Band highlights">
              {SETLIST_MOMENTS.map((moment, index) => (
                <HighlightStripedCard
                  body={moment.body}
                  index={index}
                  key={moment.title}
                  title={moment.title}
                />
              ))}
            </section>

            <section id="shows" className="waves-shows-section">
              <div className="waves-section-heading">
                <p className="waves-kicker">Upcoming shows</p>
                <h2>Catch the next swell.</h2>
              </div>

              <div className="waves-show-list">
                {SHOW_DATES.map((show) => (
                  <StripedBorder
                    key={`${show.date}-${show.venue}`}
                    contentClassName="waves-show-card"
                  >
                    <time>{show.date}</time>
                    <div>
                      <h3>{show.venue}</h3>
                      <p>
                        <MapPin aria-hidden="true" size={16} />
                        {show.location}
                      </p>
                    </div>
                    <span>{show.note}</span>
                    <a data-slot="button" href="#booking">
                      <CalendarDays aria-hidden="true" size={17} />
                      Details
                    </a>
                  </StripedBorder>
                ))}
              </div>
            </section>

            <StripedBorder
              className="waves-booking-frame"
              contentClassName="waves-booking-band"
              id="booking"
            >
              <div>
                <p className="waves-kicker">Bookings and private events</p>
                <h2>Make the party sound like the pier at sunset.</h2>
              </div>
              <a
                data-slot="button"
                className="bg-primary"
                href="mailto:hello@theswell.live"
              >
                <Ticket aria-hidden="true" size={18} />
                Book the band
              </a>
            </StripedBorder>
          </div>
          <a
            className="waves-sign-in-surfboard"
            href="/auth/sign-in"
            aria-label="Sign in"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 44 84"
              role="img"
              focusable="false"
            >
              <path
                className="waves-surfboard-shadow"
                d="M24.8 4.9C35 15.8 39.2 33.1 35.7 53.1 33.2 67.5 27.5 77.9 21.5 81.4 14.8 77.1 9.7 65.4 8.7 50.6 7.4 30.4 13.2 13.8 24.8 4.9Z"
              />
              <path
                className="waves-surfboard-shape"
                d="M22.2 2.7C32.6 13.3 37 30.4 33.7 50.4 31.3 64.8 25.7 75.3 19.7 78.9 12.9 74.7 7.7 63.1 6.6 48.3 5.1 28.2 10.7 11.6 22.2 2.7Z"
              />
              <clipPath id="waves-surfboard-clip">
                <path d="M22.2 2.7C32.6 13.3 37 30.4 33.7 50.4 31.3 64.8 25.7 75.3 19.7 78.9 12.9 74.7 7.7 63.1 6.6 48.3 5.1 28.2 10.7 11.6 22.2 2.7Z" />
              </clipPath>
              <g clipPath="url(#waves-surfboard-clip)">
                <path className="waves-surfboard-base" d="M0 0H44V84H0z" />
                <path className="waves-surfboard-teal" d="M0 0H44V29H0z" />
                <path className="waves-surfboard-gold" d="M0 29H44V49H0z" />
                <path className="waves-surfboard-coral" d="M0 49H44V84H0z" />
                <path className="waves-surfboard-stringer" d="M20.5 0H23V84H20.5z" />
              </g>
              <path
                className="waves-surfboard-outline"
                d="M22.2 2.7C32.6 13.3 37 30.4 33.7 50.4 31.3 64.8 25.7 75.3 19.7 78.9 12.9 74.7 7.7 63.1 6.6 48.3 5.1 28.2 10.7 11.6 22.2 2.7Z"
              />
              <path
                className="waves-surfboard-fin"
                d="M26.8 62.4C31.7 64.5 34.4 68.1 35.2 73.2 31.3 72.2 27.9 69.3 25.2 64.5 24.7 63.6 25.8 61.9 26.8 62.4Z"
              />
            </svg>
          </a>
        </section>
      ) : null}

      <Leva
        hidden={!showDevControls}
        collapsed={false}
        titleBar={{ title: "Wave controls" }}
        theme={{
          colors: {
            accent1: "#1b6b7a",
            accent2: "#ff7350",
            accent3: "#f4b43e",
            elevation1: "#f3e9d6",
            elevation2: "#fff8ec",
            elevation3: "#ffffff",
            folderTextColor: "#2c2a28",
            folderWidgetColor: "#1b6b7a",
            highlight1: "#2c2a28",
            highlight2: "#3f3a34",
            highlight3: "#17120f",
            vivid1: "#1b6b7a",
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
        }}
      />
      <style jsx global>{`
        #leva__root {
          color: #2c2a28;
        }

        #leva__root label,
        #leva__root label * {
          color: #2c2a28 !important;
          -webkit-text-fill-color: #2c2a28 !important;
        }

        .waves-logo-scroll-button {
          display: grid;
          width: 2.85rem;
          aspect-ratio: 1;
          place-items: center;
          border: 1px solid rgba(143, 208, 224, 0.48);
          border-radius: 999px;
          background: rgba(0, 52, 69, 0.44);
          color: rgba(243, 233, 214, 0.94);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(8px);
          transition:
            transform 180ms ease-out,
            border-color 180ms ease-out,
            background 180ms ease-out;
        }

        .waves-logo-scroll-button:hover {
          border-color: rgba(243, 233, 214, 0.72);
          background: rgba(0, 52, 69, 0.58);
          transform: translate3d(0, 2px, 0);
        }

        .waves-logo-scroll-button:focus-visible {
          outline: 2px solid rgba(244, 180, 62, 0.9);
          outline-offset: 4px;
        }

        .waves-loading-dot {
          width: 0.62rem;
          aspect-ratio: 1;
          border-radius: 999px;
          background: rgba(143, 208, 224, 0.82);
          box-shadow:
            0 0 0 0 rgba(143, 208, 224, 0.34),
            0 0 24px rgba(143, 208, 224, 0.2);
          animation: waves-loading-pulse 1.35s ease-out infinite;
        }

        @keyframes waves-loading-pulse {
          0% {
            opacity: 0.46;
            transform: scale(0.9);
            box-shadow:
              0 0 0 0 rgba(143, 208, 224, 0.32),
              0 0 20px rgba(143, 208, 224, 0.16);
          }

          72% {
            opacity: 1;
            transform: scale(1);
            box-shadow:
              0 0 0 16px rgba(143, 208, 224, 0),
              0 0 28px rgba(143, 208, 224, 0.26);
          }

          100% {
            opacity: 0.46;
            transform: scale(0.9);
            box-shadow:
              0 0 0 0 rgba(143, 208, 224, 0),
              0 0 20px rgba(143, 208, 224, 0.16);
          }
        }

        .waves-sand-section {
          min-height: 260vh;
          overflow: hidden;
          background-color: #f3e9d6;
        }

        .waves-sand-texture {
          position: absolute;
          inset: -60vh 0;
          z-index: 0;
          pointer-events: none;
          background-image: url("/images/sand_bg.jpg");
          background-position: left top;
          background-repeat: repeat;
          background-size: 720px 720px;
          backface-visibility: hidden;
          transform: translate3d(0, var(--sand-parallax-y, 0px), 0);
          will-change: transform;
        }

        .waves-sand-wash {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(
              rgba(243, 233, 214, 0.34),
              rgba(243, 233, 214, 0.34)
            ),
            radial-gradient(
              circle at 12% 0%,
              rgba(143, 208, 224, 0.1),
              transparent 34%
            ),
            radial-gradient(
              circle at 88% 4%,
              rgba(255, 115, 80, 0.1),
              transparent 30%
            );
        }

        .waves-home {
          padding-block: clamp(0.5rem, 1vw, 1.5rem) clamp(4rem, 9vw, 8rem);
        }

        .waves-kicker {
          margin: 0;
          color: var(--swell-teal-dark);
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .waves-video-placeholder {
          min-height: clamp(17rem, 42vw, 31rem);
        }

        .waves-video-screen {
          position: relative;
          display: grid;
          height: 100%;
          min-height: inherit;
          place-items: center;
          overflow: hidden;
          border: 1.5px solid var(--swell-brown-dark);
          border-radius: 12px;
          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(104, 199, 193, 0.34),
              transparent 22%
            ),
            linear-gradient(
              135deg,
              rgba(23, 18, 15, 0.94),
              rgba(47, 143, 138, 0.68)
            );
          box-shadow: inset 0 0 0 8px rgba(255, 250, 240, 0.08);
          color: var(--swell-paper-light);
        }

        .waves-video-screen::before {
          position: absolute;
          inset: 12%;
          border: 1px solid rgba(255, 250, 240, 0.28);
          border-radius: 999px;
          content: "";
          transform: rotate(-8deg);
        }

        .waves-play-button {
          z-index: 1;
          display: grid;
          width: 5.25rem;
          aspect-ratio: 1;
          place-items: center;
          border: 1.5px solid var(--swell-brown-dark);
          border-radius: 999px;
          background: var(--swell-coral);
          color: var(--swell-paper-light);
          box-shadow: 0 4px 0 var(--swell-brown-dark);
          transition:
            transform 140ms ease,
            box-shadow 140ms ease;
        }

        .waves-play-button:hover {
          box-shadow: 0 2px 0 var(--swell-brown-dark);
          transform: translateY(2px);
        }

        .waves-video-caption {
          position: absolute;
          right: 1rem;
          bottom: 1rem;
          left: 1rem;
          display: flex;
          justify-content: space-between;
          color: rgba(255, 250, 240, 0.76);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .waves-feature-copy {
          display: grid;
          align-content: center;
          gap: 1.15rem;
          padding: clamp(0.25rem, 1vw, 1rem);
        }

        .waves-feature-copy h2,
        .waves-section-heading h2,
        .waves-booking-band h2 {
          margin: 0;
          max-width: 11ch;
          color: var(--swell-brown-dark);
          font-family: var(--swell-font-display);
          font-size: clamp(2.35rem, 1.9rem + 2vw, 4.65rem);
          font-weight: 400;
          line-height: 0.92;
          text-wrap: balance;
        }

        .waves-feature-copy p:not(.waves-kicker) {
          max-width: 36rem;
          margin: 0;
          color: var(--swell-muted);
          font-size: 1.05rem;
          line-height: 1.7;
        }

        .waves-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          padding-top: 0.3rem;
        }

        .waves-action-row [data-slot="button"],
        .waves-show-card [data-slot="button"],
        .waves-booking-band [data-slot="button"] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.65rem 1rem;
          text-decoration: none;
        }

        .waves-home-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .waves-home-card {
          min-height: 16rem;
        }

        .waves-card-number {
          display: inline-grid;
          width: 2.75rem;
          aspect-ratio: 1;
          margin-bottom: 2rem;
          place-items: center;
          border: 1px solid var(--swell-line-strong);
          border-radius: 999px;
          background: var(--swell-paper-light);
          color: var(--swell-teal-dark);
          font-weight: 900;
        }

        .waves-home-card h3 {
          margin: 0;
        }

        .waves-home-card p {
          margin: 1rem 0 0;
          color: var(--swell-muted);
          line-height: 1.65;
        }

        .waves-shows-section {
          display: grid;
          gap: 1.2rem;
          padding-top: clamp(1rem, 4vw, 3rem);
        }

        .waves-section-heading {
          display: grid;
          gap: 0.65rem;
        }

        .waves-section-heading h2,
        .waves-booking-band h2 {
          max-width: 15ch;
          font-size: clamp(2rem, 1.4rem + 2vw, 3.7rem);
        }

        .waves-show-list {
          display: grid;
          gap: 0.9rem;
        }

        .waves-show-card {
          display: grid;
          grid-template-columns: minmax(4.5rem, 0.18fr) minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
        }

        .waves-show-card time {
          color: var(--swell-coral);
          font-family: var(--swell-font-display);
          font-size: 1.65rem;
          line-height: 0.95;
        }

        .waves-show-card h3 {
          margin: 0;
          color: var(--swell-brown-dark);
          font-size: 1.05rem;
          font-weight: 900;
        }

        .waves-show-card p {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin: 0.35rem 0 0;
          color: var(--swell-muted);
        }

        .waves-show-card span {
          color: var(--swell-brown);
          font-weight: 800;
        }

        .waves-booking-band {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          margin-top: clamp(1rem, 4vw, 3rem);
          padding: clamp(1.4rem, 3vw, 2.4rem);
        }

        .waves-sign-in-surfboard {
          position: absolute;
          right: clamp(1.25rem, 4vw, 3.5rem);
          bottom: clamp(1.25rem, 4vw, 3.5rem);
          z-index: 12;
          display: grid;
          width: 3.1rem;
          aspect-ratio: 1;
          place-items: center;
          border-radius: 999px;
          color: var(--swell-brown-dark);
          opacity: 0.74;
          transition:
            opacity 160ms ease,
            transform 160ms ease;
        }

        .waves-sign-in-surfboard:hover {
          opacity: 1;
          transform: translateY(-2px) rotate(-3deg);
        }

        .waves-sign-in-surfboard:focus-visible {
          outline: 2px solid var(--swell-teal);
          outline-offset: 4px;
        }

        .waves-sign-in-surfboard svg {
          width: 1.85rem;
          height: auto;
          overflow: visible;
          transform: rotate(36deg);
        }

        .waves-surfboard-shadow {
          fill: rgba(71, 48, 42, 0.24);
        }

        .waves-surfboard-shape,
        .waves-surfboard-base {
          fill: var(--swell-paper-light);
        }

        .waves-surfboard-teal {
          fill: var(--swell-teal);
        }

        .waves-surfboard-gold {
          fill: var(--swell-gold);
        }

        .waves-surfboard-coral {
          fill: var(--swell-coral);
        }

        .waves-surfboard-stringer {
          fill: rgba(44, 42, 40, 0.56);
        }

        .waves-surfboard-outline {
          fill: none;
          stroke: currentColor;
          stroke-linejoin: round;
          stroke-width: 3;
        }

        .waves-surfboard-fin {
          fill: currentColor;
        }

        @media (max-width: 780px) {
          .waves-show-card,
          .waves-booking-band {
            align-items: start;
            grid-template-columns: 1fr;
          }

          .waves-booking-band {
            display: grid;
          }

          .waves-show-card [data-slot="button"] {
            justify-self: start;
          }
        }
      `}</style>
    </main>
  );
}

function HighlightStripedCard({
  body,
  index,
  title,
}: HighlightStripedCardProps) {
  const [isIn, setIsIn] = useState(false);

  return (
    <StripedBorder
      ariaLabel={`Band highlight ${index + 1}`}
      contentClassName="waves-home-card p-6"
      in={isIn}
      onMouseEnter={() => setIsIn(true)}
      onMouseLeave={() => setIsIn(false)}
    >
      <span className="waves-card-number">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 data-slot="card-title">{title}</h3>
      <p data-slot="card-description">{body}</p>
    </StripedBorder>
  );
}

function SceneReadyNotifier({ onReady }: { onReady: () => void }) {
  const hasNotifiedRef = useRef(false);

  useFrame(() => {
    if (hasNotifiedRef.current) {
      return;
    }

    hasNotifiedRef.current = true;
    onReady();
  });

  return null;
}

function CameraSnapshotUpdater({
  controlsRef,
  isDev,
  scrollProgressRef,
  settings,
  snapshotRef,
  stripeOrientation,
  viewMode,
}: {
  controlsRef: React.RefObject<React.ElementRef<typeof OrbitControls> | null>;
  isDev: boolean;
  scrollProgressRef: React.RefObject<number>;
  settings: WaveSettings;
  snapshotRef: React.RefObject<WaveSnapshot | null>;
  stripeOrientation: StripeOrientation;
  viewMode: ViewMode;
}) {
  const { camera } = useThree();
  const dampedProgressRef = useRef(0);
  const introElapsedRef = useRef(0);

  useEffect(() => {
    if (!isDev) {
      introElapsedRef.current = 0;
    }
  }, [isDev]);

  useFrame((_, delta) => {
    const progress = scrollProgressRef.current;
    const target = controlsRef.current?.target;
    const damping = Math.max(settings.scrollDamping, 0.01);

    if (isDev) {
      dampedProgressRef.current = progress;
    } else {
      dampedProgressRef.current = THREE.MathUtils.damp(
        dampedProgressRef.current,
        progress,
        damping,
        delta,
      );
    }

    const dive = easeInOutCubic(
      THREE.MathUtils.clamp(dampedProgressRef.current / 0.58, 0, 1),
    );
    const scrollCameraZ = THREE.MathUtils.lerp(
      settings.scrollMaxZ,
      settings.scrollMinZ,
      dive,
    );
    const rawIntroProgress = isDev
      ? 1
      : THREE.MathUtils.clamp(
          (introElapsedRef.current += delta) /
            Math.max(settings.scrollIntroDuration, 0.01),
          0,
          1,
        );
    const introProgress = easeOutQuart(rawIntroProgress);

    const cameraZ = THREE.MathUtils.lerp(
      Math.max(settings.scrollPreZ, settings.scrollMaxZ),
      scrollCameraZ,
      introProgress,
    );
    const scrollTargetZ =
      settings.targetZ + (scrollCameraZ - settings.scrollMaxZ);

    if (!isDev) {
      const cameraTarget = new THREE.Vector3(
        settings.targetX,
        settings.targetY,
        scrollTargetZ,
      );

      camera.position.set(settings.cameraX, settings.cameraY, cameraZ);
      camera.lookAt(cameraTarget);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = settings.cameraFov;
        camera.updateProjectionMatrix();
      }
    }

    snapshotRef.current = {
      settings: {
        ...settings,
        stripeOrientation,
        viewMode,
      },
      camera: {
        position: {
          x: round(camera.position.x),
          y: round(camera.position.y),
          z: round(camera.position.z),
        },
        rotation: {
          x: round(camera.rotation.x),
          y: round(camera.rotation.y),
          z: round(camera.rotation.z),
        },
        target: {
          x: round(isDev ? (target?.x ?? settings.targetX) : settings.targetX),
          y: round(isDev ? (target?.y ?? settings.targetY) : settings.targetY),
          z: round(isDev ? (target?.z ?? settings.targetZ) : scrollTargetZ),
        },
        fov:
          camera instanceof THREE.PerspectiveCamera
            ? round(camera.fov)
            : settings.cameraFov,
        zoom: round(camera.zoom),
      },
    };
  });

  return null;
}

function WaveStage({
  settings,
  stripeOrientation,
}: {
  settings: WaveSettings;
  stripeOrientation: StripeOrientation;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    group.rotation.set(
      THREE.MathUtils.degToRad(settings.pitch),
      THREE.MathUtils.degToRad(settings.yaw),
      THREE.MathUtils.degToRad(settings.roll),
    );
    group.position.set(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      {(settings.mode === "stripes" || settings.mode === "both") && (
        <StripeField
          settings={settings}
          stripeOrientation={stripeOrientation}
        />
      )}
      {(settings.mode === "dots" || settings.mode === "both") && (
        <DotField
          settings={settings}
          stripeOrientation={stripeOrientation}
        />
      )}
    </group>
  );
}

function StripeField({
  settings,
  stripeOrientation,
}: {
  settings: WaveSettings;
  stripeOrientation: StripeOrientation;
}) {
  const stripes = Math.round(settings.stripes);

  return (
    <group>
      {Array.from({ length: stripes }, (_, index) => (
        <WaveStripe
          key={`${stripes}-${index}`}
          index={index}
          count={stripes}
          settings={settings}
          stripeOrientation={stripeOrientation}
        />
      ))}
    </group>
  );
}

function WaveStripe({
  index,
  count,
  settings,
  stripeOrientation,
}: {
  index: number;
  count: number;
  settings: WaveSettings;
  stripeOrientation: StripeOrientation;
}) {
  const positionRef = useRef<THREE.BufferAttribute>(null);
  const sampleCount = Math.round(settings.samples);
  const positions = useMemo(
    () => new Float32Array(sampleCount * 3),
    [sampleCount],
  );
  const color = useMemo(() => {
    const t = count <= 1 ? 0 : index / (count - 1);

    return new THREE.Color(pickGradientColor(OCEAN_COLORS, t));
  }, [count, index]);

  useFrame(({ clock }) => {
    const attribute = positionRef.current;

    if (!attribute) {
      return;
    }

    const time = clock.elapsedTime;
    const fixedY = rowToY(index, count, settings.depth);
    const fixedX = columnToX(index, count, settings.width);

    for (let column = 0; column < sampleCount; column += 1) {
      const x =
        stripeOrientation === "east-west"
          ? columnToX(column, sampleCount, settings.width)
          : fixedX;
      const y =
        stripeOrientation === "east-west"
          ? fixedY
          : rowToY(column, sampleCount, settings.depth);
      const waveZ = getWaveHeight(x, y, time, settings);
      const offset = column * 3;

      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = waveZ;
    }

    attribute.needsUpdate = true;
  });

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          ref={positionRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={Math.min(
          getDepthOpacity(index, count, settings.fade) + 0.18,
          1,
        )}
        blending={THREE.NormalBlending}
        linewidth={2}
      />
    </line>
  );
}

function DotField({
  settings,
  stripeOrientation,
}: {
  settings: WaveSettings;
  stripeOrientation: StripeOrientation;
}) {
  const positionRef = useRef<THREE.BufferAttribute>(null);
  const colorRef = useRef<THREE.BufferAttribute>(null);
  const rows = Math.round(settings.dotRows);
  const columns = Math.round(settings.dotColumns);
  const dotCount = rows * columns;
  const positions = useMemo(() => new Float32Array(dotCount * 3), [dotCount]);
  const colors = useMemo(() => new Float32Array(dotCount * 3), [dotCount]);
  const dotTexture = useMemo(() => createCirclePointTexture(), []);

  useFrame(({ clock }) => {
    const positionAttribute = positionRef.current;
    const colorAttribute = colorRef.current;

    if (!positionAttribute || !colorAttribute) {
      return;
    }

    const time = clock.elapsedTime;
    const color = new THREE.Color();

    for (let row = 0; row < rows; row += 1) {
      const y = rowToY(row, rows, settings.depth);

      for (let column = 0; column < columns; column += 1) {
        const x = columnToX(column, columns, settings.width);
        const offset = (row * columns + column) * 3;
        const jitter = Math.sin(row * 12.989 + column * 78.233) * 0.035;
        const motion = getDotMotion(row, column, time, settings);
        const movedX = x + jitter + motion.x;
        const movedY = y + motion.y;
        const gradientT = getPlaneGradientT(
          movedX,
          movedY,
          settings,
          stripeOrientation,
        );
        const paletteT = getDotPaletteT(row, column, gradientT);

        positions[offset] = movedX;
        positions[offset + 1] = movedY;
        positions[offset + 2] = getWaveHeight(movedX, movedY, time, settings);

        color.set(pickGradientColor(OCEAN_COLORS, paletteT));
        color.toArray(colors, offset);
      }
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          ref={positionRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          ref={colorRef}
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={dotTexture ?? undefined}
        size={settings.dotSize}
        sizeAttenuation
        transparent
        alphaTest={0.08}
        opacity={0.82}
        vertexColors
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

function createCirclePointTexture() {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const radius = size / 2;
  const gradient = context.createRadialGradient(
    radius,
    radius,
    0,
    radius,
    radius,
    radius,
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.64, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(radius, radius, radius, 0, Math.PI * 2);
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

function getDotMotion(
  row: number,
  column: number,
  time: number,
  settings: WaveSettings,
) {
  const direction = THREE.MathUtils.degToRad(settings.direction);
  const flowX = Math.cos(direction);
  const flowY = Math.sin(direction);
  const driftX = -flowY;
  const driftY = flowX;
  const seed = row * 12.9898 + column * 78.233;
  const driftPhase = seed + time * settings.dotWanderSpeed;
  const flowPhase = seed * 0.37 + time * settings.dotWanderSpeed * 0.74;
  const wander = Math.sin(driftPhase) * settings.dotWander;
  const flow = Math.cos(flowPhase) * settings.dotFlow;

  return {
    x: driftX * wander + flowX * flow,
    y: driftY * wander + flowY * flow,
  };
}

function getDotPaletteT(row: number, column: number, gradientT: number) {
  const randomT = pseudoRandom(row * 91.17 + column * 37.31);
  const bandT =
    Math.round(randomT * (OCEAN_COLORS.length - 1)) / (OCEAN_COLORS.length - 1);

  return THREE.MathUtils.clamp(
    THREE.MathUtils.lerp(bandT, gradientT, 0.18),
    0,
    1,
  );
}

function pseudoRandom(value: number) {
  const sine = Math.sin(value) * 10000;

  return sine - Math.floor(sine);
}

function getWaveHeight(
  x: number,
  y: number,
  time: number,
  settings: WaveSettings,
) {
  const direction = THREE.MathUtils.degToRad(settings.direction);
  const axis = Math.cos(direction) * x + Math.sin(direction) * y;
  const travel = time * settings.speed;
  const longWave = Math.sin(axis * settings.frequency - travel * 2.4);
  const crossWave = Math.sin(
    (x * 0.22 + y * 0.08) * settings.frequency + travel * 1.6,
  );
  const crest = Math.sin(axis * settings.frequency * 2.3 - travel * 3.15);
  const trough = Math.cos((y * 0.3 + x * 0.08) * settings.swell + travel);

  return (
    settings.amplitude * (longWave * 0.62 + crossWave * 0.24) +
    settings.chop * crest * Math.max(0, longWave) +
    settings.swell * trough * 0.22
  );
}

function columnToX(column: number, count: number, width: number) {
  if (count <= 1) {
    return 0;
  }

  return (column / (count - 1) - 0.5) * width;
}

function rowToY(row: number, count: number, depth: number) {
  if (count <= 1) {
    return 0;
  }

  return (row / (count - 1) - 0.5) * depth;
}

function getPlaneGradientT(
  x: number,
  y: number,
  settings: WaveSettings,
  stripeOrientation: StripeOrientation,
) {
  if (stripeOrientation === "east-west") {
    return y / settings.depth + 0.5;
  }

  return x / settings.width + 0.5;
}

function getDepthOpacity(index: number, count: number, fade: number) {
  const t = count <= 1 ? 1 : index / (count - 1);
  const near = 0.94;
  const far = THREE.MathUtils.lerp(near, 0.16, fade);

  return THREE.MathUtils.lerp(far, near, t);
}

function useScrollProgress(enabled: boolean) {
  const progressRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      progressRef.current = 0;
      return;
    }

    const update = () => {
      const scrollDistance = Math.max(window.innerHeight * 1.05, 1);
      progressRef.current = THREE.MathUtils.clamp(
        window.scrollY / scrollDistance,
        0,
        1,
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return progressRef;
}

function useHeroSceneVisibility(enabled: boolean) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setIsVisible(window.scrollY < window.innerHeight * 1.08);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return isVisible;
}

function useLogoParallax(enabled: boolean) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setOffset(0);
      return;
    }

    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setOffset(-window.scrollY * 0.34);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return offset;
}

function useSandParallax(enabled: boolean) {
  const textureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const texture = textureRef.current;

    if (!texture) {
      return;
    }

    const setOffset = (value: number) => {
      texture.style.setProperty("--sand-parallax-y", `${value.toFixed(2)}px`);
    };

    if (!enabled) {
      setOffset(0);
      return;
    }

    let frame = 0;
    let target = window.scrollY * 0.12;
    let current = target;
    let lastTime = performance.now();

    const updateTarget = () => {
      target = window.scrollY * 0.12;
    };

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);

      lastTime = time;
      current = THREE.MathUtils.damp(current, target, 8, delta);
      setOffset(current);
      frame = window.requestAnimationFrame(animate);
    };

    setOffset(current);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
    };
  }, [enabled]);

  return textureRef;
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutQuart(value: number) {
  return 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 4);
}

function forceInstantScrollBehavior() {
  const html = document.documentElement;
  const body = document.body;
  const previousHtmlBehavior = html.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  return () => {
    html.style.scrollBehavior = previousHtmlBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  };
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function pickGradientColor(stops: string[], t: number) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  const scaled = clamped * (stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, stops.length - 1);
  const localT = scaled - index;

  return new THREE.Color(stops[index])
    .lerp(new THREE.Color(stops[nextIndex]), localT)
    .getStyle();
}
