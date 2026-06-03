import { useState, useCallback } from "react";

export function useInlineValidation() {
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const showError = useCallback((text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const showSuccess = useCallback((text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const clear = useCallback(() => setMessage(null), []);

  return { message, showError, showSuccess, clear };
}
