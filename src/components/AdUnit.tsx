import { useState, useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdUnitProps {
  adSlot: string;
  adClient: string;
  format?: "auto" | "fluid" | "rectangle" | "banner" | "horizontal" | "vertical";
  layout?: string;
  className?: string;
}

export default function AdUnit({ adSlot, adClient, format = "auto", layout, className = "" }: AdUnitProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    const timer = setTimeout(() => {
      try {
        if (window.adsbygoogle && window.adsbygoogle.length > 0) {
          setIsLoaded(true);
        }
      } catch (e) {
        setHasError(true);
      }
    }, 3000);

    const checkAd = setInterval(() => {
      try {
        const ins = document.querySelector(`ins[data-ad-slot="${adSlot}"]`);
        if (ins && ins.classList.contains("adsbygoogle")) {
          const iframe = ins.querySelector("iframe");
          if (iframe && iframe.contentWindow) {
            setIsLoaded(true);
            clearInterval(checkAd);
          }
        }
      } catch (e) {}
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(checkAd);
    };
  }, [adSlot]);

  if (hasError) {
    return null;
  }

  return (
    <div className={`ad-container ${className}`} data-slot={adSlot}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: "60px" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={format === "auto" ? "true" : "false"}
        {...(layout && { "data-ad-layout": layout })}
      />
    </div>
  );
}

export function initAds() {
  if (typeof window !== "undefined" && !window.adsbygoogle) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }
}

export function useAdSense() {
  useEffect(() => {
    initAds();
  }, []);
}