import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Scroll-linked parallax media with a slow Ken Burns push-in.
 * `speed` is the fraction of scroll distance the image travels:
 * 0.2 reads as a distant backdrop, 0.05 as something almost still.
 */
export function ParallaxMedia({
  src,
  alt,
  speed = 0.18,
  height = "h-[70vh]",
  className = "",
  kenBurns = true,
  children,
}: {
  src: string;
  alt: string;
  speed?: number;
  height?: string;
  className?: string;
  kenBurns?: boolean;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : [`${-speed * 100}%`, `${speed * 100}%`]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.0, 1.08]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${height} ${className}`}>
      <motion.div style={{ y, scale }} className="absolute inset-0 will-change-transform">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-[120%] object-cover ${kenBurns && !reduce ? "ke-kenburns" : ""}`}
        />
      </motion.div>
      {children}
    </div>
  );
}

/** Cursor-tracked spotlight + subtle 3D tilt. */
export function SpotlightCard({
  children,
  className = "",
  tilt = 5,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
  as?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    if (reduce || tilt === 0) return;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * tilt}deg) rotateY(${(px - 0.5) * tilt}deg) translateY(-4px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <Tag ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`ke-spot ${className}`}>
      {children}
    </Tag>
  );
}

export default ParallaxMedia;
