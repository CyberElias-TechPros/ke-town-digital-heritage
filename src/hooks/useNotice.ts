import { useCallback, useEffect, useRef, useState } from "react";
import type { Notice, NoticeTone } from "@/components/InlineNotice";

/**
 * Small auto-expiring notice state, used to replace the remaining `alert()`
 * calls with inline feedback that never blocks the UI thread.
 *
 *   const { notice, notify, clear } = useNotice();
 *   notify("Saved!", "success");
 */
export function useNotice(duration = 5000) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setNotice(null);
  }, []);

  const notify = useCallback(
    (text: string, tone: NoticeTone = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setNotice({ text, tone });
      timer.current = setTimeout(() => setNotice(null), duration);
    },
    [duration],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { notice, notify, clear };
}

export default useNotice;
