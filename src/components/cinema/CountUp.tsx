import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion, motion } from "framer-motion";

/** Number that counts up the first time it scrolls into frame. */
export function CountUp({
  value,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (inView) mv.set(value);
  }, [inView, value, reduce, mv]);

  useEffect(() => {
    if (reduce) return;
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring, reduce]);

  const formatted = Math.abs(value) >= 1000 ? display.toLocaleString() : String(display);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZᚠᚢᚦᚨᚱᚲ/*<>[]{}#%&";

/**
 * Decodes text out of noise. Used sparingly (one word per screen) so it reads
 * as a deliberate device rather than decoration.
 */
export function TextScramble({
  text,
  className = "",
  speed = 32,
  delay = 0,
}: {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(reduce ? text : "");

  useEffect(() => {
    if (reduce) {
      setOut(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;
    const total = text.length * 2 + 8;

    const tick = () => {
      const progress = frame / total;
      const revealed = Math.floor(progress * text.length * 1.35);
      let next = "";
      for (let i = 0; i < text.length; i += 1) {
        if (text[i] === " ") {
          next += " ";
        } else if (i < revealed) {
          next += text[i];
        } else {
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setOut(next);
      frame += 1;
      if (frame <= total) raf = requestAnimationFrame(tick);
      else setOut(text);
    };

    timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, reduce, speed, delay]);

  return (
    <motion.span className={className} aria-label={text}>
      <span aria-hidden>{out || text}</span>
    </motion.span>
  );
}

/** Infinite horizontal ticker. Pass the content once; it is duplicated internally. */
export function Marquee({
  children,
  duration = 42,
  className = "",
  reverse = false,
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  reverse?: boolean;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="ke-marquee"
        style={{
          ["--marquee-duration" as string]: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

export default CountUp;
