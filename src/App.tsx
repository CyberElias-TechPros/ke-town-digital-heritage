import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import History from "./pages/History.tsx";
import Culture from "./pages/Culture.tsx";
import Gallery from "./pages/Gallery.tsx";
import Visit from "./pages/Visit.tsx";
import Diaspora from "./pages/Diaspora.tsx";
import Environment from "./pages/Environment.tsx";
import Contact from "./pages/Contact.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// ScrollToTop component - scrolls to top of page on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/history" element={<History />} />
          <Route path="/culture" element={<Culture />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/diaspora" element={<Diaspora />} />
          <Route path="/environment" element={<Environment />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const AppWrapper = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default AppWrapper;
