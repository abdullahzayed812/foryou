import { useReveal, revealClass } from "../hooks/useReveal";

export function GetStartedSection() {
  const [ref, visible] = useReveal<HTMLDivElement>();

  return (
    <section className="lp-get-started-section" id="lp-get-started">
      {/* <div ref={ref} className={`lp-get-started-box ${revealClass(visible)}`}> */}
      <video
        src="/intro.mp4"
        // controls
        autoPlay
        loop
        // playsInline
        style={{ width: "100%", borderRadius: "12px", display: "block" }}
      />
      {/* </div> */}
    </section>
  );
}
