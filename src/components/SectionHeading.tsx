import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

const SectionHeading = ({ title, subtitle, centered = true, light = false }: SectionHeadingProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`mb-12 ${centered ? "text-center" : ""}`}
    >
      <div className="flex items-center gap-3 mb-4 justify-center">
        <div className={`h-px w-12 ${light ? "bg-secondary/50" : "bg-secondary"}`} />
        <span className={`text-xs font-ui font-semibold uppercase tracking-[0.2em] ${light ? "text-secondary" : "text-secondary"}`}>
          KE Town
        </span>
        <div className={`h-px w-12 ${light ? "bg-secondary/50" : "bg-secondary"}`} />
      </div>
      <h2 className={`font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight ${light ? "text-primary-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-lg max-w-2xl ${centered ? "mx-auto" : ""} font-body ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

export default SectionHeading;
