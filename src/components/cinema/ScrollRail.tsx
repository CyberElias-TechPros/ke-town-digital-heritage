import { motion, useScroll, useSpring } from "framer-motion";

/** Hairline reading-progress rail pinned to the top of the viewport. */
export function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-[65] h-[2px] origin-left"
    >
      <div className="h-full w-full" style={{ background: "var(--gradient-gold)" }} />
    </motion.div>
  );
}

export default ScrollRail;
