import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const DRAMA = [0.76, 0, 0.24, 1] as const;

/**
 * Scroll-triggered reveal with an optional masked slide.
 * `once` keeps the page calm — elements never re-animate on the way back up.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  x = 0,
  className,
  once = true,
  amount = 0.2,
  mask = false,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  className?: string;
  once?: boolean;
  amount?: number;
  mask?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  if (mask) {
    return (
      <span className="ke-mask-line">
        <motion.span
          initial={{ y: "110%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once, amount }}
          transition={{ duration: 1.05, delay, ease: EASE }}
          className={className}
        >
          {children}
        </motion.span>
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.85, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container — pair with `<RevealItem />`. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = reduce
    ? {}
    : {
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial={reduce ? undefined : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, y = 24 }: { children: ReactNode; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
