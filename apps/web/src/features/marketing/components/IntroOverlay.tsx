import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./IntroOverlay.css";

const REGIONS = [
  { name: "china", x: 830, y: 150 },
  { name: "turkey", x: 600, y: 120 },
  { name: "gulf", x: 660, y: 230 },
  { name: "europe", x: 470, y: 90 },
  { name: "usa", x: 150, y: 150 },
] as const;
const EGYPT = { x: 560, y: 270 };
const ROUTE_LEN = 900;

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - 70;
  return `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface IntroOverlayProps {
  onComplete: () => void;
}

/** The BRD-adjacent marketing intro: logo scene, then an animated flight-path
 * world map converging on Egypt, then a fade into the real page. Ported from
 * the approved static-HTML reference as an imperative timeline driven off
 * refs (matching the original's direct-DOM choreography) rather than modeled
 * as React state — the animation is one-shot and timing-critical enough that
 * state-driven re-renders would fight the CSS transitions instead of just
 * getting out of their way. */
export function IntroOverlay({ onComplete }: IntroOverlayProps) {
  const { t } = useTranslation();
  const logoSceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mapSceneRef = useRef<HTMLDivElement>(null);
  const worldSvgRef = useRef<SVGSVGElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  // Only the user clicking "Skip" sets this — it must persist for the whole
  // component lifetime, unlike the effect's own per-invocation `cancelled`
  // flag below (see that comment for why these two can't be the same ref).
  const skipRequestedRef = useRef(false);
  const doneRef = useRef(false);

  // `onComplete` is an inline arrow function at the call site (LandingPage),
  // so it's a new reference on every render — and the hero's own scroll-
  // reveal fires almost immediately, re-rendering LandingPage within the
  // first second. If the timeline effect depended on `onComplete`/`finish`
  // directly, that re-render would restart the whole effect mid-sequence.
  // Reading the latest callback through a ref instead lets the effect run
  // exactly once, decoupled from parent renders.
  const onCompleteRef = useRef(onComplete);
  const tRef = useRef(t);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    tRef.current = t;
  });

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const injectedStyles: HTMLStyleElement[] = [];
    // Local to *this* effect invocation, not a ref — StrictMode runs this
    // effect's mount→cleanup→mount once in dev to surface exactly this class
    // of bug. A shared ref would leak the first (discarded) invocation's
    // "cleaned up" state into the second (real) one, permanently wedging the
    // timeline before it ever starts. A closure-local variable means each
    // invocation's cleanup only ever cancels its own run.
    let cancelled = false;
    const stopped = () => cancelled || skipRequestedRef.current;

    function buildWorldSvg() {
      const svg = worldSvgRef.current;
      if (!svg) return;
      svg.innerHTML = "";
      const ns = "http://www.w3.org/2000/svg";

      for (let i = 0; i < 70; i++) {
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", String(40 + Math.random() * 920));
        dot.setAttribute("cy", String(30 + Math.random() * 400));
        dot.setAttribute("r", "1.4");
        dot.setAttribute("fill", "#D8ECE1");
        svg.appendChild(dot);
      }

      const egyptG = document.createElementNS(ns, "g");
      egyptG.setAttribute("class", "lp-map-node lp-egypt lp-show");
      egyptG.innerHTML = `
        <circle class="lp-egypt-pulse" cx="${EGYPT.x}" cy="${EGYPT.y}" r="14" fill="none" stroke="#E8A33D" stroke-width="3"></circle>
        <circle class="lp-dot" cx="${EGYPT.x}" cy="${EGYPT.y}" r="10"></circle>
        <text class="lp-egypt-label" x="${EGYPT.x + 18}" y="${EGYPT.y + 6}">${tRef.current("landing.intro.egypt")}</text>
      `;
      svg.appendChild(egyptG);

      for (const region of REGIONS) {
        const g = document.createElementNS(ns, "g");
        g.setAttribute("class", "lp-map-node");
        g.setAttribute("id", `lp-node-${region.name}`);
        const regionLabel = tRef.current(`landing.intro.regionLabels.${region.name}`);
        g.innerHTML = `
          <circle
            class="lp-dot"
            cx="${region.x}"
            cy="${region.y}"
            r="10"
          ></circle>

          <text
            class="lp-region-label"
            x="${region.x}"
            y="${region.y - 24}"
            text-anchor="middle"
            font-size="28"
            font-weight="700"
          >
            ${regionLabel}
          </text>
        `;
        svg.appendChild(g);

        const d = curvePath(region, EGYPT);
        const path = document.createElementNS(ns, "path");
        path.setAttribute("class", "lp-route-path");
        path.setAttribute("id", `lp-route-${region.name}`);
        path.setAttribute("d", d);
        path.style.strokeDasharray = String(ROUTE_LEN);
        path.style.strokeDashoffset = String(ROUTE_LEN);
        svg.appendChild(path);

        const plane = document.createElementNS(ns, "text");
        plane.setAttribute("class", "lp-route-plane");
        plane.setAttribute("id", `lp-plane-${region.name}`);
        plane.setAttribute("font-size", "26");
        plane.textContent = "✈️";
        plane.style.offsetPath = `path('${d}')`;
        svg.appendChild(plane);
      }
    }

    async function playRegion(region: (typeof REGIONS)[number]) {
      const svg = worldSvgRef.current;
      if (!svg || stopped()) return;
      const node = svg.querySelector<SVGGElement>(`#lp-node-${region.name}`);
      const path = svg.querySelector<SVGPathElement>(`#lp-route-${region.name}`);
      const plane = svg.querySelector<SVGTextElement>(`#lp-plane-${region.name}`);
      if (!node || !path || !plane) return;

      node.classList.add("lp-show");
      await sleep(150);
      if (stopped()) return;

      path.classList.add("lp-draw");
      plane.classList.add("lp-fly");
      const keyframeName = `lp-fly-route-${region.name}`;
      const styleTag = document.createElement("style");
      styleTag.textContent = `@keyframes ${keyframeName}{0%{offset-distance:0%;opacity:0;}8%{opacity:1;}92%{opacity:1;}100%{offset-distance:100%;opacity:0;}}`;
      document.head.appendChild(styleTag);
      injectedStyles.push(styleTag);
      plane.style.animation = `${keyframeName} 1.3s var(--lp-ease) forwards`;

      await sleep(1300);
      if (stopped()) return;
      path.classList.add("lp-landed");

      const caption = captionRef.current;
      if (caption) {
        caption.textContent = tRef.current(`landing.intro.regions.${region.name}`);
        caption.classList.add("lp-show");
      }
      await sleep(1300);
      if (stopped()) return;
      caption?.classList.remove("lp-show");
      await sleep(200);
    }

    async function run() {
      if (prefersReduced) {
        finish();
        return;
      }

      logoSceneRef.current?.classList.add("lp-show");

      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        await v.play().catch(() => {});
        await new Promise<void>((resolve) => {
          let ended = false;
          const end = () => {
            if (!ended) {
              ended = true;
              resolve();
            }
          };
          v.onended = end;
          v.addEventListener("error", end); // in case video fails to load
          setTimeout(end, 10000); // 10s fallback
        });
      } else {
        await sleep(3000);
      }

      if (stopped()) return;

      logoSceneRef.current?.classList.add("lp-fade-out");
      await sleep(700);
      if (stopped()) return;

      buildWorldSvg();
      mapSceneRef.current?.classList.add("lp-show");
      await sleep(500);

      for (const region of REGIONS) {
        if (stopped()) return;
        await playRegion(region);
      }
      if (stopped()) return;

      await sleep(900);
      mapSceneRef.current?.classList.add("lp-fade-out");
      await sleep(900);

      finish();
    }

    void run();

    return () => {
      cancelled = true;
      for (const tag of injectedStyles) tag.remove();
    };
    // `finish` is stable (see its own comment above) and `t` is read via
    // `tRef` — this effect is meant to run exactly once, on mount.
  }, [finish]);

  function skip() {
    skipRequestedRef.current = true;
    finish();
  }

  return (
    <div className="lp-intro">
      <button type="button" className="lp-skip-btn" onClick={skip}>
        {t("landing.intro.skip")}
      </button>
      <div className="lp-intro-stage">
        <div ref={logoSceneRef} className="lp-logo-scene" style={{ backgroundColor: "#00292d" }}>
          <video
            ref={videoRef}
            src="/intro.mp4"
            className="lp-intro-video"
            playsInline
            muted
            style={{ width: "90%", maxWidth: "400px", borderRadius: "16px" }}
          />
        </div>

        <div ref={mapSceneRef} className="lp-map-scene">
          <div className="lp-map-holder">
            <svg ref={worldSvgRef} viewBox="0 0 1000 460" style={{ overflow: "visible" }} />
            <div ref={captionRef} className="lp-map-caption" />
          </div>
        </div>
      </div>
    </div>
  );
}
