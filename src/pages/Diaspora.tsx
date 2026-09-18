import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Users, Heart, Briefcase, BookOpen, ArrowRight, Loader2, CreditCard, Check, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import SEO from "@/components/PageSEO";
import { api, asList } from "@/lib/api";

const diasporaLocations = [
  { city: "Port Harcourt", country: "Nigeria", members: "Largest concentration" },
  { city: "Lagos", country: "Nigeria", members: "Growing community" },
  { city: "London", country: "United Kingdom", members: "Active group" },
  { city: "Houston", country: "United States", members: "Established chapter" },
  { city: "Abuja", country: "Nigeria", members: "Government workers" },
];

const opportunities = [
  { title: "Youth Mentorship Program", type: "Mentorship", desc: "Connect with experienced professionals from the Ke Kingdom diaspora for career guidance." },
  { title: "Community Development Volunteer", type: "Volunteer", desc: "Help organize and execute development projects in Ke Kingdom during your next visit." },
  { title: "Cultural Documentation Intern", type: "Internship", desc: "Help document Kalabari oral histories, language, and traditions for digital preservation." },
];

interface Project {
  _id: string;
  title: string;
  description: string;
  status: string;
  goalAmount: number;
  raisedAmount: number;
  image?: string;
  updates: Array<{ text: string; date: string }>;
}

const Diaspora = () => {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    city: "",
    country: "",
    connection: "",
    bio: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [donationForm, setDonationForm] = useState({
    donorName: "",
    donorEmail: "",
    amount: "",
    message: "",
    isAnonymous: false,
  });
  const [isDonating, setIsDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [donationError, setDonationError] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(asList<Project>(data));
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterError("");

    try {
      await api.registerDirectory(registerForm);
      setRegisterSuccess(true);
      setRegisterForm({ fullName: "", email: "", city: "", country: "", connection: "", bio: "" });
      setTimeout(() => {
        setRegisterOpen(false);
        setRegisterSuccess(false);
      }, 3000);
    } catch (err: any) {
      setRegisterError(err.message || "Failed to register. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDonating(true);
    setDonationError("");

    try {
      const amount = parseFloat(donationForm.amount);
      if (isNaN(amount) || amount < 100) {
        throw new Error("Minimum donation is ₦100");
      }

      const response = await api.initializeDonation({
        donorName: donationForm.donorName,
        donorEmail: donationForm.donorEmail,
        amount,
        projectId: selectedProject?._id,
        message: donationForm.message,
        isAnonymous: donationForm.isAnonymous,
      });

      // Redirect to Paystack payment page
      const { authorization_url } = response as any;
      if (authorization_url) {
        window.location.href = authorization_url;
      } else {
        setDonationSuccess(true);
        setDonationForm({ donorName: "", donorEmail: "", amount: "", message: "", isAnonymous: false });
        setTimeout(() => {
          setDonateOpen(false);
          setDonationSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      setDonationError(err.message || "Failed to process donation. Please try again.");
    } finally {
      setIsDonating(false);
    }
  };

  const openDonateModal = (project: Project) => {
    setSelectedProject(project);
    setDonateOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <SEO page="/diaspora" />
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
              Connecting Ke Kingdom sons and daughters across Nigeria and the world — stay informed, give back, and come home.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Directory */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Community Worldwide" subtitle="Ke Kingdom diaspora across the globe" />
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

      {/* Historical Migrations */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Historical Migrations" subtitle="How Ke Kingdom's people spread across the Niger Delta and beyond" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">The Dispersal of Ke</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                Ke was once a massive "metropolis" of the Delta before several catastrophes reduced its size. Oral traditions record three major depopulation events:
              </p>
              <ul className="space-y-3">
                {[
                  { title: "The Fallen Silk Cotton Tree", desc: "A giant tree fell during a festival, killing thousands and leading to mass exodus." },
                  { title: "The Pestilence", desc: "A severe disease outbreak (likely smallpox) forced survivors to flee to Okrika, Nembe, and Bonny." },
                  { title: "War with 'Sea Beings'", desc: "Possibly early conflicts with European slave raiders or coastal adversaries." },
                ].map((event, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-secondary text-xs font-ui font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <span className="text-sm font-ui font-medium text-foreground">{event.title}:</span>{" "}
                      <span className="text-sm text-muted-foreground font-body">{event.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mt-4">
                Ke migrants first settled at <strong className="text-foreground">Fibiri</strong> before moving to Oloma and eventually becoming part of the Grand Bonny Kingdom. This migration path connects Ke to communities across the eastern Niger Delta.
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">The European Name Tradition</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                Contact with Portuguese, Dutch, English, and Welsh traders gave Kalabari people Western surnames that persist today — a living marker of 400 years of maritime trade:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {["Briggs", "West", "Harry", "Dicks", "Princewill", "Horsefall", "Bob-Manuel", "Georgewill", "Johnbull", "Omekwe", "Amachree", "Oruwari", "Owukori"].map((name, i) => (
                  <span key={i} className="inline-block px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-ui">
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                In Ke, common lineage surnames follow the <strong className="text-foreground">Kemsaipruye-Igbo</strong> house tradition. Names like Amachree and Briggs have royal/chief-class significance. These surnames are evidence of centuries of international commerce and cultural exchange.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Development Projects */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Development Projects" subtitle="Community-driven initiatives to improve Ke Kingdom" />
          {isLoadingProjects ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <AnimatedCard key={project._id} delay={i * 0.1}>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={16} className="text-secondary" />
                      <span className="tag-ke bg-secondary/10 text-secondary capitalize">{project.status.replace("_", " ")}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">{project.title}</h3>
                    <p className="text-sm text-muted-foreground font-body mb-4 line-clamp-2">{project.description}</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs font-ui text-muted-foreground mb-1">
                        <span>{formatCurrency(project.raisedAmount)} raised</span>
                        <span>Goal: {formatCurrency(project.goalAmount)}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Math.min((project.raisedAmount / project.goalAmount) * 100, 100)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-secondary rounded-full"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => openDonateModal(project)}
                      className="text-sm text-secondary font-ui font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Contribute <ArrowRight size={14} />
                    </button>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-body">No projects available at the moment.</p>
            </div>
          )}
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
              Come Home to Ke Kingdom
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              Plan your homecoming visit. Whether it's for the Kalabari New Year Festival or just to reconnect with your roots — Ke Kingdom awaits.
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
            <p className="text-sm text-muted-foreground font-body mb-6">Register to be listed in the Ke Kingdom community directory (opt-in).</p>
            
            {registerSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-display text-xl font-semibold text-foreground mb-2">Registration Successful!</h4>
                <p className="text-muted-foreground font-body text-sm">
                  Your registration has been submitted for approval.
                </p>
              </motion.div>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                {registerError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-ui">{registerError}</span>
                  </div>
                )}
                <input
                  placeholder="Full Name"
                  required
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <input
                  placeholder="Email"
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="City"
                    required
                    value={registerForm.city}
                    onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  <input
                    placeholder="Country"
                    required
                    value={registerForm.country}
                    onChange={(e) => setRegisterForm({ ...registerForm, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <select
                  required
                  value={registerForm.connection}
                  onChange={(e) => setRegisterForm({ ...registerForm, connection: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Connection to Ke Kingdom</option>
                  <option value="born">Born in Ke Kingdom</option>
                  <option value="descendant">Descendant</option>
                  <option value="married">Married into</option>
                  <option value="friend">Friend / Ally</option>
                </select>
                <textarea
                  placeholder="Brief bio (optional)"
                  value={registerForm.bio}
                  onChange={(e) => setRegisterForm({ ...registerForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                />
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Donate Modal */}
      {donateOpen && selectedProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setDonateOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-xl border border-border p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Contribute to Project</h3>
            <p className="text-sm text-muted-foreground font-body mb-2">{selectedProject.title}</p>
            <p className="text-xs text-muted-foreground font-body mb-6">
              {formatCurrency(selectedProject.raisedAmount)} raised of {formatCurrency(selectedProject.goalAmount)} goal
            </p>
            
            {donationSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-display text-xl font-semibold text-foreground mb-2">Thank You!</h4>
                <p className="text-muted-foreground font-body text-sm">
                  Your contribution has been received.
                </p>
              </motion.div>
            ) : (
              <form className="space-y-4" onSubmit={handleDonate}>
                {donationError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-ui">{donationError}</span>
                  </div>
                )}
                <input
                  placeholder="Your Name"
                  required
                  value={donationForm.donorName}
                  onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <input
                  placeholder="Your Email"
                  type="email"
                  required
                  value={donationForm.donorEmail}
                  onChange={(e) => setDonationForm({ ...donationForm, donorEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-ui text-sm">₦</span>
                  <input
                    placeholder="Amount (min ₦100)"
                    type="number"
                    required
                    min="100"
                    value={donationForm.amount}
                    onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <textarea
                  placeholder="Message (optional)"
                  value={donationForm.message}
                  onChange={(e) => setDonationForm({ ...donationForm, message: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={donationForm.isAnonymous}
                    onChange={(e) => setDonationForm({ ...donationForm, isAnonymous: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
                  />
                  <span className="text-sm text-muted-foreground font-ui">Donate anonymously</span>
                </label>
                <button
                  type="submit"
                  disabled={isDonating}
                  className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDonating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      Donate with Paystack
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
};

export default Diaspora;
