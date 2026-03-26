import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const AnimatedCard = ({ children, delay = 0, className = "" }: AnimatedCardProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`bg-card rounded-xl border border-border shadow-[var(--shadow-card)] hover-lift ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
