import { useEffect, useRef, useState, type RefObject } from "react";

/** Scroll-triggered fade/rise-in, mirroring the reference page's `.reveal`/`.reveal.in`
 * pattern — observes once, then disconnects (no repeat-on-scroll-back).
 *
 * Returns a tuple rather than `{ref, className}`: the lint rules treat any
 * property read off an object that also carries a ref as "accessing a ref
 * during render", even for unrelated properties like a plain boolean. A
 * tuple sidesteps that false positive entirely. */
export function useReveal<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

export function revealClass(visible: boolean): string {
  return `lp-reveal ${visible ? "lp-in" : ""}`;
}
