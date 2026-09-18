import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type NoticeTone = "success" | "error" | "info" | "warning";

export interface Notice {
  tone: NoticeTone;
  text: string;
}

const styles: Record<NoticeTone, { wrap: string; icon: typeof Info }> = {
  success: { wrap: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  error: { wrap: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300", icon: AlertTriangle },
  warning: { wrap: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: AlertTriangle },
  info: { wrap: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: Info },
};

/**
 * Replacement for `alert()`: an inline, animated, dismissible strip.
 * Use `useNotice()` to own the state, then render `<InlineNotice notice={...} />`.
 */
export function InlineNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss?: () => void }) {
  if (!notice) return null;
  const { wrap, icon: Icon } = styles[notice.tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${wrap}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1 leading-snug">{notice.text}</p>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export default InlineNotice;
