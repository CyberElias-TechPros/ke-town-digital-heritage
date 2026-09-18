import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { TextScramble } from "./CountUp";

const GREETINGS = [
  { kalabari: "A ro sin te oo", english: "You are welcome" },
  { kalabari: "Kengemina Kalabari", english: "The Kalabari nation stands" },
  { kalabari: "Owu sun te", english: "Peace be with you" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Full-bleed cinematic hero.
 *
 * Four planes move at different rates — water imagery, gradient wash, aurora
 * light and the headline block — so the composition has real depth while
 * scrolling. The headline is revealed word by word from behind a mask.
 */
export function CinematicHero({
  image,
  eyebrow,
  lines,
  accentLine,
  lede,
  primary,
  secondary,
  stats,
}: {
  image: string;
  eyebrow: string;
  lines: string[];
  accentLine: string;
  lede: string;
  primary: { label: string; to: string };
  secondary: { label: string; to: string };
  stats?: { value: number; label: string; prefix?: string; suffix?: string }[];
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.18]);
  const imageBlur = useTransform(scrollYProgress, [0, 1], ["0px", reduce ? "0px" : "6px"]);
  const washOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.75, 0.35]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "55%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45, 0.8], [1, 0.7, 0]);
  const railProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const [greeting, setGreeting] = useState(0);
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setGreeting((g) => (g + 1) % GREETINGS.length), 6500);
    return () => clearInterval(id);
  }, [reduce]);

  const words = lines.flatMap((line) => line.split(" "));

  return (
    <section
      ref={ref}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-ke-deep text-white"
    >
      {/* Plane 1 — imagery */}
      <motion.div style={{ y: imageY, scale: imageScale, filter: imageBlur }} className="absolute inset-0">
        <img
          src={image}
          alt=""
          className={`h-full w-full object-cover ${reduce ? "" : "ke-kenburns"}`}
        />
      </motion.div>

      {/* Plane 2 — depth wash */}
      <motion.div
        style={{ opacity: washOpacity }}
        className="absolute inset-0"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-b from-ke-deep/45 via-ke-deep/70 to-ke-deep" />
        <div className="absolute inset-0 bg-gradient-to-r from-ke-deep/70 via-transparent to-ke-water/25" />
        <div className="ke-aurora absolute inset-0" />
      </motion.div>

      {/* Plane 3 — light sweep */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-1/3 -left-1/4 h-[160%] w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent"
          animate={{ x: ["-40%", "260%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
        />
      )}

      {/* Plane 4 — content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex h-full flex-col justify-center px-5 sm:px-10 lg:px-20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="mb-7 flex items-center gap-3"
          >
            <span className="h-px w-10 bg-secondary/70" />
            <span className="ke-eyebrow text-secondary">{eyebrow}</span>
          </motion.div>

          <h1 className="ke-display ke-balance text-[clamp(2.6rem,9vw,7.5rem)] text-white">
            {lines.map((line, li) => (
              <span key={line} className="ke-mask-line">
                <motion.span
                  initial={reduce ? { opacity: 1 } : { y: "110%" }}
                  animate={reduce ? { opacity: 1 } : { y: "0%" }}
                  transition={{ duration: 1.1, delay: 0.28 + li * 0.12, ease: EASE }}
                >
                  {line.split(" ").map((word, wi) => {
                    const globalIndex = words.slice(0, words.lastIndexOf(word) + 1).length - 1;
                    return (
                      <motion.span
                        key={`${li}-${word}-${wi}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.4 + globalIndex * 0.05 }}
                        className="inline-block"
                      >
                        {word}
                        {wi < line.split(" ").length - 1 ? "\u00A0" : ""}
                      </motion.span>
                    );
                  })}
                </motion.span>
              </span>
            ))}
            <span className="ke-mask-line">
              <motion.span
                initial={reduce ? { opacity: 1 } : { y: "110%" }}
                animate={reduce ? { opacity: 1 } : { y: "0%" }}
                transition={{ duration: 1.1, delay: 0.28 + lines.length * 0.12, ease: EASE }}
                className="text-gradient-gold"
              >
                {accentLine}
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
            className="ke-pretty mt-7 max-w-xl font-body text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {lede}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <MagneticButton to={primary.to} variant="solid">
              {primary.label} <ArrowRight size={16} />
            </MagneticButton>
            <MagneticButton to={secondary.to} variant="outline" className="text-white">
              {secondary.label}
            </MagneticButton>
          </motion.div>

          {stats && stats.length > 0 && (
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.3 }}
              className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-7 border-t border-white/12 pt-8 sm:grid-cols-4"
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="ke-eyebrow text-white/45">{s.label}</dt>
                  <dd className="ke-display mt-2 text-2xl text-secondary sm:text-3xl">
                    {s.prefix}
                    {s.value.toLocaleString()}
                    {s.suffix}
                  </dd>
                </div>
              ))}
            </motion.dl>
          )}
        </div>
      </motion.div>

      {/* Greeting strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-24 left-5 z-10 sm:left-10 lg:left-20"
      >
        <p className="ke-eyebrow mb-1.5 text-white/40">Kalabari</p>
        <p
          key={greeting}
          className="font-display text-lg italic text-secondary sm:text-xl"
          style={{ animation: reduce ? undefined : "fadeUp 0.7s var(--ease-cinema) both" }}
        >
          <TextScramble text={GREETINGS[greeting].kalabari} />
        </p>
        <p className="mt-0.5 text-xs text-white/50">{GREETINGS[greeting].english}</p>
      </motion.div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 right-5 z-10 flex items-center gap-3 sm:right-10 lg:right-20">
        <span className="ke-eyebrow text-white/40">
          {Math.round(progress * 100).toString().padStart(2, "0")}
        </span>
        <div className="relative h-px w-16 bg-white/20 sm:w-24">
          <motion.div style={{ width: railProgress }} className="h-px bg-secondary" />
        </div>
        <motion.span
          animate={reduce ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="text-secondary"
        >
          <ChevronDown size={18} />
        </motion.span>
      </div>
    </section>
  );
}

export default CinematicHero;
