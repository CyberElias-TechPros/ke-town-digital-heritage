import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Adds a faint film-grain + vignette over the whole app and a short
 * luminance wipe whenever the route changes, so navigation feels like a
 * cut between shots rather than a hard repaint.
 */
export function GrainOverlay() {
  const { pathname } = useLocation();
  const [wipeKey, setWipeKey] = useState(pathname);

  useEffect(() => {
    setWipeKey(pathname);
  }, [pathname]);

  return (
    <>
      <div className="ke-grain" aria-hidden />
      <div className="ke-vignette" aria-hidden />
      <AnimatePresence>
        <motion.div
          key={wipeKey}
          aria-hidden
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-0 z-[70]"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 0%, hsl(37 65% 47% / 0.18), transparent 70%)",
          }}
        />
      </AnimatePresence>
    </>
  );
}

export default GrainOverlay;
