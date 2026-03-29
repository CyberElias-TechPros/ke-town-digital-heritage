import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface WhatsAppShareProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: "floating" | "inline" | "button";
  size?: "sm" | "md" | "lg";
}

const WhatsAppShare = ({
  title = "KE Kingdom Digital Heritage",
  text = "Check out KE Kingdom Digital Heritage - preserving Kalabari culture and connecting the community!",
  url,
  className = "",
  variant = "floating",
  size = "md",
}: WhatsAppShareProps) => {
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedText = encodeURIComponent(`${title}\n\n${text}\n\n${shareUrl}`);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;

  const handleClick = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  };

  if (variant === "floating") {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`fixed bottom-6 right-6 z-50 ${sizeClasses[size]} bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#128C7E] transition-colors ${className}`}
        aria-label="Share on WhatsApp"
      >
        <MessageCircle size={iconSizes[size]} fill="currentColor" />
      </motion.button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg font-ui text-sm font-medium hover:bg-[#128C7E] transition-colors ${className}`}
      >
        <MessageCircle size={16} fill="currentColor" />
        Share on WhatsApp
      </button>
    );
  }

  // Button variant
  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] transition-colors ${className}`}
      aria-label="Share on WhatsApp"
    >
      <MessageCircle size={iconSizes[size]} fill="currentColor" />
    </button>
  );
};

export default WhatsAppShare;