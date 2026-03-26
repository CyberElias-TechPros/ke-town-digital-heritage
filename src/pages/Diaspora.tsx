import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Users, Heart, Briefcase, BookOpen, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";

const diasporaLocations = [
  { city: "Port Harcourt", country: "Nigeria", members: "Largest concentration" },
  { city: "Lagos", country: "Nigeria", members: "Growing community" },
  { city: "London", country: "United Kingdom", members: "Active group" },
  { city: "Houston", country: "United States", members: "Established chapter" },
  { city: "Abuja", country: "Nigeria", members: "Government workers" },
];

const projects = [
  { title: "Community Hall Renovation", status: "In Progress", raised: "₦2.5M", goal: "₦5M", progress: 50 },
  { title: "Borehole Water Project", status: "Planning", raised: "₦800K", goal: "₦3M", progress: 27 },
  { title: "Primary School Upgrade", status: "Fundraising", raised: "₦1.2M", goal: "₦4M", progress: 30 },
];

const opportunities = [
  { title: "Youth Mentorship Program", type: "Mentorship", desc: "Connect with experienced professionals from the Ke Town diaspora for career guidance." },
  { title: "Community Development Volunteer", type: "Volunteer", desc: "Help organize and execute development projects in Ke Town during your next visit." },
  { title: "Cultural Documentation Intern", type: "Internship", desc: "Help document Kalabari oral histories, language, and traditions for digital preservation." },
];

const Diaspora = () => {
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Diaspora Connect</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              One Community, <span className="text-gradient-gold">Worldwide</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Connecting Ke Town sons and daughters across Nigeria and the world — stay informed, give back, and come home.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Directory */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Community Worldwide" subtitle="Ke Town diaspora across the globe" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {diasporaLocations.map((loc, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-ke-water/10 flex items-center justify-center">
                    <Globe size={22} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{loc.city}</h3>
                    <p className="text-xs text-muted-foreground font-ui">{loc.country} • {loc.members}</p>
                  </div>
                </div>
              </AnimatedCard>
            ))}
            <AnimatedCard delay={0.5}>
              <button
                onClick={() => setRegisterOpen(true)}
                className="p-5 w-full flex items-center gap-4 text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Users size={22} className="text-secondary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-secondary">Register Yourself</h3>
                  <p className="text-xs text-muted-foreground font-ui">Join the community directory</p>
                </div>
              </button>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Development Projects */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Development Projects" subtitle="Community-driven initiatives to improve Ke Town" />
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-secondary" />
                    <span className="tag-ke bg-secondary/10 text-secondary">{project.status}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3">{project.title}</h3>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-ui text-muted-foreground mb-1">
                      <span>{project.raised} raised</span>
                      <span>Goal: {project.goal}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${project.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-secondary rounded-full"
                      />
                    </div>
                  </div>
                  <button className="text-sm text-secondary font-ui font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                    Contribute <ArrowRight size={14} />
                  </button>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Opportunities */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Opportunities" subtitle="Ways to contribute and connect" />
          <div className="grid md:grid-cols-3 gap-6">
            {opportunities.map((opp, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <span className="tag-ke bg-accent/10 text-accent mb-3 inline-block">{opp.type}</span>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{opp.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{opp.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Homecoming CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Come Home to Ke Town
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              Plan your homecoming visit. Whether it's for the Kalabari New Year Festival or just to reconnect with your roots — Ke Town awaits.
            </p>
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]">
              Plan Your Visit <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Register Modal */}
      {registerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setRegisterOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-xl border border-border p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Join the Directory</h3>
            <p className="text-sm text-muted-foreground font-body mb-6">Register to be listed in the Ke Town community directory (opt-in).</p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setRegisterOpen(false); }}>
              <input placeholder="Full Name" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              <input placeholder="Email" type="email" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              <input placeholder="City, Country" className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              <select className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary">
                <option value="">Connection to Ke Town</option>
                <option>Born in Ke Town</option>
                <option>Descendant</option>
                <option>Married into</option>
                <option>Friend / Ally</option>
              </select>
              <button type="submit" className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all">
                Register
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
};

export default Diaspora;
