import { useCallback, useEffect, useRef, useState } from "react";

type Slide = { type: "image"; src: string } | { type: "video"; src: string };

const SLIDES: Slide[] = [
  { type: "image", src: "/cur1.jpeg" },
  { type: "image", src: "/cur2.jpeg" },
  { type: "image", src: "/cur3.jpeg" },
  { type: "image", src: "/cur4.jpeg" },
  { type: "video", src: "/cur5.mp4" },
];

export function GetStartedCarousel() {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const goTo = useCallback((i: number) => {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (SLIDES[index]?.type === "video") {
      video.currentTime = 0;
      void video.play();
    } else {
      video.pause();
    }
  }, [index]);

  return (
    <div className="lp-carousel">
      <div className="lp-carousel-viewport">
        <div
          className="lp-carousel-track"
          style={{ transform: `translateX(${index * -100}%)` }}
        >
          {SLIDES.map((slide) =>
            slide.type === "video" ? (
              <video
                key={slide.src}
                ref={videoRef}
                src={slide.src}
                className="lp-carousel-slide"
                controls
                loop
                playsInline
              />
            ) : (
              <img key={slide.src} src={slide.src} className="lp-carousel-slide" alt="" />
            ),
          )}
        </div>
      </div>

      <button
        type="button"
        className="lp-carousel-arrow lp-carousel-arrow-prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        className="lp-carousel-arrow lp-carousel-arrow-next"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      <div className="lp-carousel-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            className={`lp-carousel-dot ${i === index ? "lp-carousel-dot-active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
