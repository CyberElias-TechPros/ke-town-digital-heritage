import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Search } from "lucide-react";
import SearchModal from "./SearchModal";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "History", path: "/history" },
  { label: "Culture", path: "/culture" },
  { label: "Gallery", path: "/gallery" },
  { label: "Visit", path: "/visit" },
  { label: "Diaspora", path: "/diaspora" },
  { label: "Environment", path: "/environment" },
  { label: "Contact", path: "/contact" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-primary/95 backdrop-blur-md shadow-lg py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container-narrow flex items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg group-hover:scale-110 transition-transform">
              K
            </div>
            <div>
              <span className="font-display text-xl font-bold text-primary-foreground tracking-tight">
                KE Kingdom
              </span>
              <span className="hidden md:block text-xs text-primary-foreground/60 font-ui -mt-0.5">
                Kalabari Heritage
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-ui font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? "bg-secondary/20 text-secondary"
                    : "text-primary-foreground/80 hover:text-secondary hover:bg-secondary/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search and Mobile toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-primary-foreground/80 hover:text-secondary p-2 hover:bg-secondary/10 rounded-md transition-colors flex items-center gap-2"
              aria-label="Search"
            >
              <Search size={20} />
              <span className="hidden md:block text-sm font-ui">Search</span>
              <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-primary-foreground/50 bg-primary-foreground/10 rounded">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-primary-foreground p-2 hover:bg-secondary/10 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden bg-primary/98 backdrop-blur-md border-t border-primary-foreground/10 overflow-hidden"
            >
              <nav className="flex flex-col px-4 py-4 gap-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={link.path}
                      className={`block px-4 py-3 rounded-lg text-base font-ui font-medium transition-all ${
                        location.pathname === link.path
                          ? "bg-secondary/20 text-secondary"
                          : "text-primary-foreground/80 hover:bg-secondary/10 hover:text-secondary"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
