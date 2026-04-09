import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Facebook, MessageCircle, Send, Camera, BookOpen, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import SEO from "@/components/PageSEO";
import { api } from "@/lib/api";

const contactMethods = [
  { icon: Facebook, title: "Facebook", desc: "KE Kingdom Community Page (498+ followers)", link: "#", action: "Visit Page" },
  { icon: MessageCircle, title: "WhatsApp", desc: "Join our WhatsApp community group", link: "#", action: "Join Group" },
  { icon: Mail, title: "Email", desc: "info@keKingdom.com.ng", link: "mailto:info@keKingdom.com.ng", action: "Send Email" },
  { icon: MapPin, title: "Location", desc: "Ke Kingdom, Degema LGA, Rivers State, Nigeria", link: "#", action: "View Map" },
  { icon: BookOpen, title: "Tech Training", desc: "Cyber Elias Academy - Digital skills, courses & services", link: "https://cybereliasacademy.com.ng", action: "Visit Academy", accent: true },
];

const submissionTypes = [
  { icon: Camera, title: "Submit a Photo", desc: "Share historical photos, festival images, or community moments" },
  { icon: BookOpen, title: "Share a Story", desc: "Tell us about your family history, memories, or oral traditions" },
  { icon: Send, title: "Post an Announcement", desc: "Submit a community event, news, or milestone announcement" },
];

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "", type: "general" });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.submitContact(formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "", type: "general" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setNewsletterLoading(true);
    setNewsletterError("");

    try {
      await api.subscribeNewsletter(newsletterEmail);
      setNewsletterSubmitted(true);
      setNewsletterEmail("");
      setTimeout(() => setNewsletterSubmitted(false), 5000);
    } catch (err: any) {
      setNewsletterError(err.message || "Failed to subscribe. Please try again.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <Layout>
      <SEO page="/contact" />
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Contact & Community</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Get in <span className="text-gradient-gold">Touch</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Reach out to community leadership, submit your stories, or connect with the Ke Kingdom family worldwide.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactMethods.map((method, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <a 
                  href={method.link} 
                  target={method.link.startsWith('http') ? '_blank' : undefined}
                  rel={method.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`p-6 block text-center group ${method.accent ? 'bg-secondary/5 border border-secondary/20 rounded-xl' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${method.accent ? 'bg-secondary/20' : 'bg-ke-gold/10'}`}>
                    <method.icon size={24} className={method.accent ? 'text-secondary' : 'text-secondary'} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">{method.title}</h3>
                  <p className="text-xs text-muted-foreground font-body mb-3">{method.desc}</p>
                  <span className="text-sm text-secondary font-ui font-medium">{method.action} →</span>
                </a>
              </AnimatedCard>
            ))}
          </div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <SectionHeading title="Send a Message" subtitle="We'd love to hear from you" centered={false} />
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary/10 border border-secondary/20 text-secondary rounded-lg p-4 mb-6 font-ui text-sm"
                >
                  ✓ Thank you! Your message has been sent. We'll get back to you soon.
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6 font-ui text-sm"
                >
                  {error}
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="story">Submit a Story</option>
                    <option value="photo">Submit a Photo</option>
                    <option value="event">Event Announcement</option>
                    <option value="feedback">Feedback</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Subject</label>
                  <input
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What's this about?"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Your message..."
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Submission types */}
            <div className="lg:col-span-2">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">Ways to Contribute</h3>
              <div className="space-y-4">
                {submissionTypes.map((type, i) => (
                  <AnimatedCard key={i} delay={i * 0.1}>
                    <div className="p-5 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-ke-gold/10 flex items-center justify-center flex-shrink-0">
                        <type.icon size={18} className="text-secondary" />
                      </div>
                      <div>
                        <h4 className="font-display text-base font-semibold text-foreground">{type.title}</h4>
                        <p className="text-xs text-muted-foreground font-body mt-1">{type.desc}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Newsletter */}
              <div className="mt-8 bg-primary rounded-xl p-6">
                <h4 className="font-display text-lg font-semibold text-primary-foreground mb-2">Newsletter</h4>
                <p className="text-primary-foreground/70 text-sm font-body mb-4">
                  Stay updated with community news, events, and announcements.
                </p>
                {newsletterSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-secondary/20 border border-secondary/30 text-secondary-foreground rounded-lg p-3 mb-4 font-ui text-sm"
                  >
                    ✓ Successfully subscribed to the newsletter!
                  </motion.div>
                )}
                {newsletterError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/20 border border-destructive/30 text-destructive-foreground rounded-lg p-3 mb-4 font-ui text-sm"
                  >
                    {newsletterError}
                  </motion.div>
                )}
                <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground font-ui text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  <button 
                    type="submit" 
                    disabled={newsletterLoading}
                    className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {newsletterLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
