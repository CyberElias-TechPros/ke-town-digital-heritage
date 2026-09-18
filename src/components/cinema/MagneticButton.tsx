import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Button that leans toward the cursor and fires a shine sweep on hover.
 * Works as a router `<Link>` when `to` is given, otherwise a `<button>`.
 */
export function MagneticButton({
  children,
  to,
  href,
  onClick,
  type = "button",
  variant = "solid",
  className = "",
  strength = 14,
  disabled = false,
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "solid" | "outline" | "ghost";
  className?: string;
  strength?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const [hovered, setHovered] = useState(false);

  const handleMove = (e: React.MouseEvent) => {
    if (reduce || disabled) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
    y.set(((e.clientY - r.top) / r.height - 0.5) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
    setHovered(false);
  };

  const base =
    "ke-shine inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold text-sm px-7 py-3.5 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    solid: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[var(--shadow-gold)]",
    outline:
      "border border-white/25 bg-white/5 hover:bg-white/10 backdrop-blur-sm hover:border-white/40",
    ghost: "text-secondary hover:text-secondary/80 px-0",
  };
  const classes = `${base} ${variants[variant]} ${className}`;

  const inner = (
    <motion.span style={{ x: sx, y: sy }} className="inline-flex items-center gap-2">
      {children}
    </motion.span>
  );

  const shared = {
    ref: ref as any,
    onMouseMove: handleMove,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: reset,
    onClick,
    className: classes,
    "data-hover": hovered,
  };

  if (to) {
    return (
      <Link to={to} {...shared}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...shared}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} {...shared}>
      {inner}
    </button>
  );
}

export default MagneticButton;
