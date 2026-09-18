import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, Plus, Clock, Video, Search, Filter } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api, asList } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  category: string;
  coverImage?: string;
  organizer: { _id: string; fullName: string; avatar?: string };
  rsvps: string[];
  maxAttendees?: number;
  isVirtual: boolean;
  virtualLink?: string;
  isRsvped?: boolean;
}

const eventCategories = [
  { id: "all", label: "All Events" },
  { id: "general", label: "General" },
  { id: "education", label: "Education" },
  { id: "business", label: "Business" },
  { id: "culture", label: "Culture" },
  { id: "sports", label: "Sports" },
  { id: "technology", label: "Technology" },
  { id: "health", label: "Health" },
  { id: "religion", label: "Religion" },
  { id: "entertainment", label: "Entertainment" },
];

export default function Events() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [myRsvps, setMyRsvps] = useState<string[]>([]);

  useEffect(() => {
    loadEvents();
    if (token) {
      loadMyRsvps();
    }
  }, [selectedCategory, token]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(token || undefined) as { events: Event[] };
      let filteredEvents = data.events || [];
      
      if (selectedCategory !== "all") {
        filteredEvents = filteredEvents.filter(e => e.category === selectedCategory);
      }
      
      // Mark RSVPed events
      filteredEvents = filteredEvents.map(e => ({
        ...e,
        isRsvped: myRsvps.includes(e._id)
      }));
      
      setEvents(filteredEvents);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRsvps = async () => {
    if (!token) return;
    try {
      const data = await api.getEvents(token) as { events: Event[] };
      setMyRsvps(asList<any>(data, 'events').map(e => e._id));
    } catch (err) {
      console.error("Failed to load RSVPs:", err);
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      await api.rsvpEvent(token, eventId);
      setMyRsvps([...myRsvps, eventId]);
      loadEvents();
    } catch (err) {
      console.error("Failed to RSVP:", err);
    }
  };

  const handleCancelRsvp = async (eventId: string) => {
    if (!token) return;
    try {
      await api.cancelRsvp(token, eventId);
      setMyRsvps(myRsvps.filter(id => id !== eventId));
      loadEvents();
    } catch (err) {
      console.error("Failed to cancel RSVP:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-secondary" size={28} />
                <h1 className="font-display text-2xl font-bold text-foreground">Events</h1>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
                >
                  <Plus size={16} /> Create Event
                </button>
              )}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {eventCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg font-ui text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event, i) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="relative h-32 bg-gradient-to-br from-secondary/20 to-accent/20">
                      {event.coverImage ? (
                        <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar size={48} className="text-secondary/30" />
                        </div>
                      )}
                      {event.isVirtual && (
                        <span className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Video size={12} /> Virtual
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-0.5 rounded mb-2 inline-block">
                        {event.category}
                      </span>
                      <h3 className="font-display text-base font-semibold text-foreground mb-2 line-clamp-1">{event.title}</h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>{event.rsvps?.length || 0} attending</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        {myRsvps.includes(event._id) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelRsvp(event._id); }}
                            className="w-full px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium"
                          >
                            Cancel RSVP
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRsvp(event._id); }}
                            className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90"
                          >
                            RSVP
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No events found.</p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-secondary hover:underline"
                  >
                    Create the first event
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            isRsvped={myRsvps.includes(selectedEvent._id)}
            onClose={() => setSelectedEvent(null)}
            onRsvp={() => handleRsvp(selectedEvent._id)}
            onCancelRsvp={() => handleCancelRsvp(selectedEvent._id)}
          />
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(event) => {
          setEvents([event, ...events]);
          setShowCreateModal(false);
        }}
      />
    </Layout>
  );
}

function EventDetailModal({ event, isRsvped, onClose, onRsvp, onCancelRsvp }: { 
  event: Event; 
  isRsvped: boolean; 
  onClose: () => void;
  onRsvp: () => void;
  onCancelRsvp: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-40 bg-gradient-to-br from-secondary/20 to-accent/20">
          {event.coverImage ? (
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar size={64} className="text-secondary/30" />
            </div>
          )}
          {event.isVirtual && (
            <span className="absolute top-3 right-3 bg-blue-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Video size={12} /> Virtual Event
            </span>
          )}
        </div>
        <div className="p-6">
          <span className="text-xs font-ui text-muted-foreground bg-muted px-2 py-1 rounded mb-3 inline-block">
            {event.category}
          </span>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">{event.title}</h3>
          
          <div className="space-y-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{event.rsvps?.length || 0} people attending {event.maxAttendees ? `(max ${event.maxAttendees})` : ''}</span>
            </div>
          </div>
          
          <p className="text-muted-foreground mb-6">{event.description}</p>
          
          {event.virtualLink && (
            <a
              href={event.virtualLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-3 bg-blue-500 text-white rounded-lg font-ui font-semibold mb-3 hover:bg-blue-600 transition-colors"
            >
              Join Virtual Event
            </a>
          )}
          
          {isRsvped ? (
            <button
              onClick={onCancelRsvp}
              className="w-full px-4 py-3 bg-secondary/10 text-secondary rounded-lg font-ui font-semibold hover:bg-secondary/20 transition-colors"
            >
              Cancel RSVP
            </button>
          ) : (
            <button
              onClick={onRsvp}
              className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold hover:bg-secondary/90 transition-colors"
            >
              RSVP to Event
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateEventModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (event: Event) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    category: "general",
    isVirtual: false,
    virtualLink: "",
    maxAttendees: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.title || !form.date) return;

    setLoading(true);
    try {
      const dateTime = new Date(`${form.date}T${form.time || '00:00'}`);
      const event = await api.createEvent(token, {
        title: form.title,
        description: form.description,
        startDate: dateTime.toISOString(),
        location: form.location || 'Ke Kingdom',
        category: form.category,
        isVirtual: form.isVirtual,
        virtualLink: form.virtualLink,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined
      }) as Event;
      onCreated(event);
      setForm({ title: "", description: "", date: "", time: "", location: "", category: "general", isVirtual: false, virtualLink: "", maxAttendees: "" });
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl border border-border max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="font-display text-xl font-bold text-foreground mb-4">Create Event</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Event Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What's the event?"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell people about your event"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Where is it?"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="general">General</option>
                  <option value="education">Education</option>
                  <option value="business">Business</option>
                  <option value="culture">Culture</option>
                  <option value="sports">Sports</option>
                  <option value="technology">Technology</option>
                  <option value="health">Health</option>
                  <option value="religion">Religion</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={form.isVirtual}
                  onChange={(e) => setForm({ ...form, isVirtual: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isVirtual" className="text-sm text-foreground">Virtual Event</label>
              </div>
              {form.isVirtual && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Virtual Link</label>
                  <input
                    type="url"
                    value={form.virtualLink}
                    onChange={(e) => setForm({ ...form, virtualLink: e.target.value })}
                    placeholder="https://zoom.us/..."
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Attendees (optional)</label>
                <input
                  type="number"
                  value={form.maxAttendees}
                  onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !form.title || !form.date}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}