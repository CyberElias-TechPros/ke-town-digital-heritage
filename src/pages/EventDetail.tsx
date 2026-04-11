import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2, MapPin, Calendar, Clock, Users, Globe, Link as LinkIcon, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";
import { formatDistanceToNow, format } from "date-fns";

interface EventData {
  _id: string;
  name: string;
  description: string;
  type: string;
  coverImage?: string;
  startDate: string;
  endDate?: string;
  isVirtual: boolean;
  virtualLink?: string;
  location?: { name: string; lat?: number; lng?: number };
  maxAttendees?: number;
  rsvpDeadline?: string;
  privacy: string;
  host: { _id: string; fullName: string; avatar: string; isVerified?: boolean };
  rsvps: { user: string; status: string }[];
  createdAt: string;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [rsvping, setRsvping] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
  }, [id]);

  const loadEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const data = await api.getEvent(eventId);
      setEvent(data as EventData);
      
      if (user && (data as EventData).rsvps) {
        const userRsvp = (data as EventData).rsvps.find((r: any) => r.user === user.id);
        if (userRsvp) {
          setRsvpStatus(userRsvp.status);
        }
      }
    } catch (err) {
      console.error("Failed to load event:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (status: string) => {
    if (!token || !id) {
      navigate("/login");
      return;
    }
    
    setRsvping(true);
    try {
      if (status === rsvpStatus) {
        await api.removeRsvp(token, id);
        setRsvpStatus(null);
      } else {
        await api.rsvpEvent(token, id, status);
        setRsvpStatus(status);
      }
      loadEvent(id);
    } catch (err) {
      console.error("Failed to RSVP:", err);
    } finally {
      setRsvping(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.name,
        text: event?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      community: "Community Gathering",
      workshop: "Workshop",
      market: "Market Day",
      sports: "Sports Event",
      cultural: "Cultural Celebration",
      educational: "Educational",
      religious: "Religious",
      political: "Political",
      fundraiser: "Fundraiser",
      virtual: "Virtual Event",
      other: "Other",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="min-h-screen pt-32 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Event not found</h2>
            <button
              onClick={() => navigate("/events")}
              className="text-primary hover:underline"
            >
              Browse events
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isHost = user?.id === event.host._id;
  const rsvpCount = event.rsvps?.filter(r => r.status === "going").length || 0;
  const interestedCount = event.rsvps?.filter(r => r.status === "interested").length || 0;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Header */}
          <div className="sticky top-20 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate("/events")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cover Image */}
          {event.coverImage && (
            <div className="h-64 overflow-hidden">
              <img
                src={event.coverImage}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {!event.coverImage && (
            <div className="h-48 bg-gradient-to-br from-primary to-secondary" />
          )}

          {/* Event Info */}
          <div className="p-4 space-y-6">
            {/* Title & Type */}
            <div>
              <span className="text-sm text-primary font-medium">
                {getEventTypeLabel(event.type)}
              </span>
              <h1 className="text-2xl font-bold mt-1">{event.name}</h1>
            </div>

            {/* Date & Time */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-5 h-5" />
                <span>{format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-5 h-5" />
                <span>{format(new Date(event.startDate), "h:mm a")}</span>
              </div>
            </div>

            {/* Location / Virtual */}
            {event.isVirtual ? (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Globe className="w-5 h-5" />
                <span>Virtual Event</span>
                {event.virtualLink && (
                  <a
                    href={event.virtualLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Join Link
                  </a>
                )}
              </div>
            ) : event.location && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5" />
                <span>{event.location.name}</span>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {rsvpCount} going
              </span>
              <span>{interestedCount} interested</span>
              {event.maxAttendees && (
                <span>• {event.maxAttendees} max</span>
              )}
            </div>

            {/* Host */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {event.host.avatar ? (
                <img
                  src={event.host.avatar}
                  alt={event.host.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-ivory">
                  {event.host.fullName.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Hosted by</p>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{event.host.fullName}</span>
                  {event.host.isVerified && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {/* RSVP Actions */}
            {!isHost && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRsvp("interested")}
                  disabled={rsvping}
                  className={`flex-1 py-3 rounded-lg transition-colors ${
                    rsvpStatus === "interested"
                      ? "bg-primary text-white"
                      : "border border-primary text-primary hover:bg-primary/10"
                  }`}
                >
                  {rsvping ? "Loading..." : "Interested"}
                </button>
                <button
                  onClick={() => handleRsvp("going")}
                  disabled={rsvping}
                  className={`flex-1 py-3 rounded-lg transition-colors ${
                    rsvpStatus === "going"
                      ? "bg-primary text-white"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {rsvping ? "Loading..." : "Going"}
                </button>
              </div>
            )}

            {/* RSVP Deadline */}
            {event.rsvpDeadline && (
              <p className="text-sm text-gray-500">
                RSVP by {format(new Date(event.rsvpDeadline), "MMMM d, yyyy")}
              </p>
            )}

            {/* Posted */}
            <p className="text-sm text-gray-400">
              Posted {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}