import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Facebook, MapPin } from "lucide-react";
import { useAdSense } from "./AdUnit";

const AD_CLIENT = "ca-pub-9117572925263537";

const Footer = () => {
  useAdSense();
  const [adsLoaded, setAdsLoaded] = useState(false);

  useEffect(() => {
    const checkAds = setInterval(() => {
      const ads = document.querySelectorAll(".adsbygoogle");
      if (ads.length > 0) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdsLoaded(true);
        } catch (e) {}
      }
    }, 500);

    setTimeout(() => {
      clearInterval(checkAds);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdsLoaded(true);
      } catch (e) {}
    }, 2000);

    return () => clearInterval(checkAds);
  }, []);

  const quickLinks = [
    { label: "History", path: "/history" },
    { label: "Timeline", path: "/timeline" },
    { label: "Culture", path: "/culture" },
    { label: "Elder Stories", path: "/elder-stories" },
    { label: "Gallery", path: "/gallery" },
    { label: "Marketplace", path: "/marketplace" },
    { label: "Virtual Tours", path: "/virtual-tours" },
  ];

  const communityLinks = [
    { label: "Visit", path: "/visit" },
    { label: "Diaspora", path: "/diaspora" },
    { label: "Environment", path: "/environment" },
    { label: "Posts", path: "/posts" },
    { label: "Contact", path: "/contact" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Wave top */}
      <div className="w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 60" className="w-full h-[40px] md:h-[60px]" preserveAspectRatio="none">
          <path
            fill="hsl(160 37% 16%)"
            d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,20 1440,30 L1440,60 L0,60 Z"
          />
        </svg>
      </div>

      {/* Ad Space - Above Footer (Only shows when ad loads) */}
      {adsLoaded && (
        <div className="bg-primary/95 py-4 border-b border-primary-foreground/10">
          <div className="container-narrow px-4">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", minHeight: "90px" }}
              data-ad-client={AD_CLIENT}
              data-ad-slot="7966964742"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}

      <div className="container-narrow px-4 md:px-8 pb-12 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg">
                K
              </div>
              <span className="font-display text-xl font-bold">KE Kingdom</span>
            </div>
            <p className="text-primary-foreground/70 text-sm font-body leading-relaxed">
              A digital home for the Kalabari community of Ke Kingdom, Degema LGA, Rivers State. Preserving culture, connecting diaspora.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-secondary">Quick Links</h4>
            <ul className="space-y-2 font-ui text-sm">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-secondary">Community</h4>
            <ul className="space-y-2 font-ui text-sm">
              {communityLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-secondary">Contact</h4>
            <div className="space-y-3 font-ui text-sm text-primary-foreground/70">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-secondary flex-shrink-0" />
                <span>Ke Kingdom, Degema LGA, Rivers State</span>
              </div>
              <div className="flex items-center gap-2">
                <Facebook size={14} className="text-secondary flex-shrink-0" />
                <a href="#" className="hover:text-secondary transition-colors">KE Kingdom Facebook</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-xs font-ui">
            © {new Date().getFullYear()} KE Kingdom Community. All rights reserved.
          </p>
          <p className="text-primary-foreground/50 text-xs font-ui">
            Preserving Kalabari Heritage for Future Generations
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;