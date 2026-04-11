import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, X, Loader2, MapPin, Calendar, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "../lib/api";

const eventTypes = [
  { id: "community", label: "Community Gathering" },
  { id: "workshop", label: "Workshop" },
  { id: "market", label: "Market Day" },
  { id: "sports", label: "Sports Event" },
  { id: "cultural", label: "Cultural Celebration" },
  { id: "educational", label: "Educational" },
  { id: "religious", label: "Religious" },
  { id: "political", label: "Political" },
  { id: "fundraiser", label: "Fundraiser" },
  { id: "virtual", label: "Virtual Event" },
  { id: "other", label: "Other" },
];

export default function CreateEvent() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "community",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    isVirtual: false,
    virtualLink: "",
    location: "",
    maxAttendees: "",
    rsvpDeadline: "",
    privacy: "public",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !token) return;
    
    setUploading(true);
    try {
      const uploaded = await api.uploadFile(token, e.target.files[0]);
      setCoverImage((uploaded as { url: string }).url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.name.trim()) {
      alert("Please enter an event name");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!formData.startDate || !formData.startTime) {
      alert("Please enter the start date and time");
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        coverImage,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        rsvpDeadline: formData.rsvpDeadline ? new Date(formData.rsvpDeadline).toISOString() : undefined,
        startDate: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
        endDate: formData.endDate && formData.endTime 
          ? new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
          : undefined,
      };
      
      await api.createEvent(token, eventData);
      navigate("/events");
    } catch (err) {
      console.error("Failed to create event:", err);
      alert("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="min-h-screen pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate("/events")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Create Event</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Image */}
            <div>
              <h2 className="font-semibold mb-2">Cover Image</h2>
              <div className="relative h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                {coverImage ? (
                  <>
                    <img
                      src={coverImage}
                      alt="Event cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500 mt-1">
                      {uploading ? "Uploading..." : "Add Cover Image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Event Name */}
            <div>
              <label className="block font-semibold mb-2">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="What's the event called?"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell people what the event is about..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block font-semibold mb-2">Event Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Virtual Event */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isVirtual}
                  onChange={(e) => setFormData({ ...formData, isVirtual: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-semibold">This is a virtual event</span>
              </label>
            </div>

            {formData.isVirtual && (
              <div>
                <label className="block font-semibold mb-2">Virtual Meeting Link</label>
                <input
                  type="url"
                  value={formData.virtualLink}
                  onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                  placeholder="https://zoom.us/..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Location */}
            {!formData.isVirtual && (
              <div>
                <label className="block font-semibold mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where will it be held?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Max Attendees */}
            <div>
              <label className="block font-semibold mb-2">Maximum Attendees</label>
              <input
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                placeholder="Leave empty for unlimited"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* RSVP Deadline */}
            <div>
              <label className="block font-semibold mb-2">RSVP Deadline</label>
              <input
                type="date"
                value={formData.rsvpDeadline}
                onChange={(e) => setFormData({ ...formData, rsvpDeadline: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Privacy */}
            <div>
              <label className="block font-semibold mb-2">Privacy</label>
              <select
                value={formData.privacy}
                onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="public">Public - Anyone can see</option>
                <option value="private">Private - Invite only</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Event...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}