import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import History from "./pages/History.tsx";
import Culture from "./pages/Culture.tsx";
import Gallery from "./pages/Gallery.tsx";
import Visit from "./pages/Visit.tsx";
import Diaspora from "./pages/Diaspora.tsx";
import Environment from "./pages/Environment.tsx";
import Contact from "./pages/Contact.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Profile from "./pages/Profile.tsx";
import Posts from "./pages/Posts.tsx";
import Activity from "./pages/Activity.tsx";
import Timeline from "./pages/Timeline.tsx";
import ElderStories from "./pages/ElderStories.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import VirtualTours from "./pages/VirtualTours.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import Messages from "./pages/Messages.tsx";
import DigitalSkills from "./pages/DigitalSkills.tsx";
import keicon from "./assets/keicon.png";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-primary flex flex-col items-center justify-center">
    <img 
      src={keicon} 
      alt="KE Kingdom" 
      className="w-20 h-20 rounded-full mb-6 animate-pulse"
    />
    <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ScrollToTop component - scrolls to top of page on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/elder-stories" element={<ElderStories />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/virtual-tours" element={<VirtualTours />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/digital-skills" element={<DigitalSkills />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AppWrapper = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default AppWrapper;
