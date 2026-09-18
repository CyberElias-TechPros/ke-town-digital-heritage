import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GrainOverlay } from "@/components/cinema/GrainOverlay";
import { ScrollRail } from "@/components/cinema/ScrollRail";
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
import ForgotPassword from "./pages/ForgotPassword.tsx";
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
import Chat from "./pages/Chat.tsx";
import DigitalSkills from "./pages/DigitalSkills.tsx";
import Feed from "./pages/Feed.tsx";
import Groups from "./pages/Groups.tsx";
import GroupDetail from "./pages/GroupDetail.tsx";
import CreateGroup from "./pages/CreateGroup.tsx";
import Events from "./pages/Events.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import CreateEvent from "./pages/CreateEvent.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import Orders from "./pages/Orders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import Seller from "./pages/Seller.tsx";
import Settings from "./pages/Settings.tsx";
import Notifications from "./pages/Notifications.tsx";
import Explore from "./pages/Explore.tsx";
import SavedPosts from "./pages/SavedPosts.tsx";
import Product from "./pages/Product.tsx";
import CreateListing from "./pages/CreateListing.tsx";
import Search from "./pages/Search.tsx";
import SocialMediaLayout from "./components/SocialMediaLayout.tsx";
import keicon from "./assets/keicon.png";

const queryClient = new QueryClient();

/**
 * Opening curtain. Two panels part horizontally and the wordmark fades up,
 * so the very first frame already reads as a designed moment rather than a
 * spinner. Reduced-motion users get an immediate crossfade.
 */
const LoadingScreen = () => {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-ke-deep">
      {!reduce && (
        <>
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-ke-deep"
            initial={{ x: 0 }}
            animate={{ x: "-100%" }}
            transition={{ duration: 0.9, delay: 0.75, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-ke-deep"
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.9, delay: 0.75, ease: [0.76, 0, 0.24, 1] }}
          />
        </>
      )}
      <div className="ke-aurora relative flex h-full flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          <img src={keicon} alt="KE Kingdom" className="mb-6 h-20 w-20 rounded-full" />
          <p className="ke-eyebrow mb-3 text-secondary">Ke Kingdom</p>
          <h1 className="ke-display text-3xl text-white">Digital Heritage</h1>
          <div className="mt-7 h-px w-40 overflow-hidden bg-white/15">
            <motion.div
              className="h-px origin-left"
              style={{ background: "var(--gradient-gold)" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

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
          <ScrollRail />
          <GrainOverlay />
          <Routes>
            {/* Public Routes */}
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/elder-stories" element={<ElderStories />} />
            <Route path="/virtual-tours" element={<VirtualTours />} />
            <Route path="/digital-skills" element={<DigitalSkills />} />

            {/* Unified Social Media Layout - wraps authenticated social routes */}
            <Route element={<SocialMediaLayout />}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<Chat />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/create" element={<CreateGroup />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/create" element={<CreateEvent />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/create" element={<CreateListing />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/search" element={<Search />} />
              <Route path="/saved" element={<SavedPosts />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/posts" element={<Posts />} />
            </Route>

            {/* Standalone Routes (outside layout) */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/seller" element={<Seller />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
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
