import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Fish, FileText, ExternalLink, Leaf, Droplets, Loader2, Send, Check, AlertCircle, HeartPulse, ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import envImg from "@/assets/environment-mangrove.jpg";
import { api } from "@/lib/api";

const impactStats = [
  { label: "Fish Species at Risk", value: "270+", icon: Fish },
  { label: "Barrels Spilled Annually", value: "240K", icon: AlertTriangle },
  { label: "Food Security Reduction", value: "60%", icon: ShieldAlert },
  { label: "Respiratory Issues", value: "68%", icon: HeartPulse },
];

const resources = [
  { name: "NDDC", full: "Niger Delta Development Commission", desc: "Federal agency for Niger Delta development and remediation", url: "#" },
  { name: "HYPREP", full: "Hydrocarbon Pollution Remediation Project", desc: "UNEP-backed program for environmental cleanup in Ogoniland and surrounding areas", url: "#" },
  { name: "NOSDRA", full: "National Oil Spill Detection & Response Agency", desc: "Nigerian agency responsible for oil spill detection, monitoring, and response", url: "#" },
];

interface EnvironmentReport {
  _id: string;
  title: string;
  description: string;
  year?: string;
  location: string;
  impact?: string;
  status: string;
  sources?: string[];
  image?: string;
  createdAt: string;
}

const Environment = () => {
  const [reports, setReports] = useState<EnvironmentReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: "",
    description: "",
    year: "",
    location: "",
    impact: "",
    sources: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await api.getEnvironmentReports();
      setReports(data as EnvironmentReport[]);
    } catch (error) {
      console.error("Failed to fetch environment reports:", error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const sourcesArray = reportForm.sources
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await api.submitEnvironmentReport({
        ...reportForm,
        sources: sourcesArray,
      });

      setSubmitSuccess(true);
      setReportForm({
        title: "",
        description: "",
        year: "",
        location: "",
        impact: "",
        sources: "",
      });

      // Refresh reports
      await fetchReports();

      setTimeout(() => {
        setShowReportForm(false);
        setSubmitSuccess(false);
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={envImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(160 37% 16% / 0.7) 0%, hsl(160 37% 16% / 0.9) 100%)" }} />
        </div>
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-destructive/20 text-destructive border border-destructive/30 mb-4 inline-block font-ui">Environment & Advocacy</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Protecting Our <span className="text-gradient-gold">Waters</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Documenting environmental impact, advocating for justice, and championing the return to traditional fishing and ecological stewardship.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-10 bg-muted/50">
        <div className="container-narrow px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {impactStats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <stat.icon size={24} className="text-secondary mx-auto mb-2" />
              <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
              <div className="text-xs font-ui text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Oil Spill Tracker */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="flex items-center justify-between mb-6">
            <SectionHeading title="Environmental Impact" subtitle="Documenting the effects of oil infrastructure on our community" centered={false} />
            <button
              onClick={() => setShowReportForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all"
            >
              <FileText size={16} />
              Submit Report
            </button>
          </div>

          {isLoadingReports ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-6">
              {reports.map((report, i) => (
                <AnimatedCard key={report._id} delay={i * 0.1}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle size={18} className="text-destructive" />
                      <span className="tag-ke bg-destructive/10 text-destructive capitalize">{report.status}</span>
                      {report.year && <span className="text-xs font-ui text-muted-foreground">{report.year}</span>}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">{report.title}</h3>
                    <p className="text-sm text-muted-foreground font-ui mb-2">{report.location}</p>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{report.description}</p>
                    {report.impact && (
                      <p className="text-sm text-destructive font-body mt-2">
                        <strong>Impact:</strong> {report.impact}
                      </p>
                    )}
                    {report.sources && report.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {report.sources.map((source, idx) => (
                          <span key={idx} className="text-xs font-ui text-accent bg-accent/10 px-2 py-1 rounded">
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-body">No environment reports available.</p>
            </div>
          )}
        </div>
      </section>

      {/* Health Impact */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Health Impact on Communities" subtitle="The human cost of oil pollution in Degema LGA and surrounding Kalabari communities" />
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <HeartPulse size={20} className="text-destructive" />
                Health Statistics
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Neonatal Mortality", value: "29 per 1,000 births" },
                  { label: "Infant Mortality", value: "57 per 1,000 births" },
                  { label: "Skilled Birth Attendance", value: "Only 17% of births" },
                  { label: "Respiratory Issues (refining areas)", value: "68% of residents vs 22% in non-exposed areas" },
                ].map((stat, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-ui font-medium text-foreground">{stat.label}:</span>{" "}
                      <span className="text-sm text-muted-foreground font-body">{stat.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShieldAlert size={20} className="text-destructive" />
                Contamination Data
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Benzene in Drinking Water", value: "1,200 μg/L — 240× WHO guidelines" },
                  { label: "Heavy Metals (Lead, Cadmium)", value: "200-300% above FAO/WHO thresholds" },
                  { label: "Annual Crude Oil Spilled", value: "~240,000 barrels in the Niger Delta" },
                  { label: "Household Food Security", value: "60% reduction in oil-impacted communities" },
                ].map((stat, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-ui font-medium text-foreground">{stat.label}:</span>{" "}
                      <span className="text-sm text-muted-foreground font-body">{stat.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Specific Incidents */}
          <div className="bg-card rounded-xl border border-destructive/20 p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">Notable Incidents</h3>
            <div className="space-y-4">
              <div className="border-l-3 border-destructive pl-4">
                <span className="text-xs font-ui text-destructive font-medium">2024–2025</span>
                <h4 className="font-display text-base font-semibold text-foreground mt-1">NNPC OML-18 Bukuma Well 8 Fire</h4>
                <p className="text-sm text-muted-foreground font-body mt-1">A wellhead fire caused by illegal bunkering devastated multiple communities in Degema LGA including Buguma and Bukuma. The Kalabari Regent declared the area a "disaster zone." Ke and neighbouring communities face ongoing environmental threats.</p>
              </div>
              <div className="border-l-3 border-destructive pl-4">
                <span className="text-xs font-ui text-destructive font-medium">2019</span>
                <h4 className="font-display text-base font-semibold text-foreground mt-1">Kalaekuleama Burning by Operation Delta Safe</h4>
                <p className="text-sm text-muted-foreground font-body mt-1">Kalaekuleama community (a constituent of Ke Kingdom) was mistakenly burned by Operation Delta Safe due to false illegal bunkering reports — highlighting the dangers of misinformation in the region.</p>
              </div>
              <div className="border-l-3 border-secondary pl-4">
                <span className="text-xs font-ui text-secondary font-medium">2022</span>
                <h4 className="font-display text-base font-semibold text-foreground mt-1">Ke Kingdom's Zero-Tolerance Declaration</h4>
                <p className="text-sm text-muted-foreground font-body mt-1">The Concerned Youths of Ke (CYK) publicly debunked media claims of ongoing bunkering, citing proactive reporting to authorities and town-crier announcements under Governor Wike's anti-crime drive.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beyond Oil Campaign */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="tag-ke bg-ke-water/10 text-accent mb-4 inline-block">Campaign</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Beyond Oil</h2>
              <p className="text-muted-foreground font-body leading-relaxed mb-4">
                A community-led initiative to revive traditional fishing practices, restore damaged waterways, and create sustainable livelihoods that honor Kalabari heritage.
              </p>
              <p className="text-muted-foreground font-body leading-relaxed mb-6">
                The Niger Delta's mangrove ecosystem supports over 270 fish species, crabs, oysters, shrimps, and periwinkles. By returning to ecological stewardship, we protect both our environment and our cultural identity.
              </p>
              <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-ui font-semibold text-sm hover:bg-accent/90 transition-all">
                Support the Campaign
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <img src={envImg} alt="Mangrove ecosystem" loading="lazy" className="w-full h-80 object-cover rounded-xl shadow-[var(--shadow-elevated)]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Resources & Organizations" subtitle="Links to remediation and advocacy bodies" />
          <div className="grid md:grid-cols-3 gap-6">
            {resources.map((res, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-accent" />
                    <span className="font-ui font-bold text-accent text-sm">{res.name}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-2">{res.full}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-3">{res.desc}</p>
                  <a href={res.url} className="text-sm text-accent font-ui font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                    Visit <ExternalLink size={12} />
                  </a>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Petition CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Add Your Voice
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              Sign community advocacy letters and support petitions for environmental justice in the Niger Delta.
            </p>
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]">
              Contact for Advocacy
            </a>
          </motion.div>
        </div>
      </section>

      {/* Report Submission Modal */}
      {showReportForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-primary/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowReportForm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-xl border border-border p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Submit Environment Report</h3>
            <p className="text-sm text-muted-foreground font-body mb-6">Help document environmental issues affecting Ke Kingdom and the Niger Delta.</p>

            {submitSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-display text-xl font-semibold text-foreground mb-2">Report Submitted!</h4>
                <p className="text-muted-foreground font-body text-sm">
                  Thank you for your contribution to environmental documentation.
                </p>
              </motion.div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmitReport}>
                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="text-sm font-ui">{submitError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Title *</label>
                  <input
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="e.g., Oil Spill at Bille Creek"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Location *</label>
                  <input
                    required
                    value={reportForm.location}
                    onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                    placeholder="e.g., Ke Kingdom, Bille Area"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Year</label>
                    <input
                      value={reportForm.year}
                      onChange={(e) => setReportForm({ ...reportForm, year: e.target.value })}
                      placeholder="e.g., 2024"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Status</label>
                    <select className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary">
                      <option value="documented">Documented</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Description *</label>
                  <textarea
                    required
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Describe the environmental issue..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Impact</label>
                  <textarea
                    value={reportForm.impact}
                    onChange={(e) => setReportForm({ ...reportForm, impact: e.target.value })}
                    placeholder="Describe the environmental impact..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-ui font-medium text-foreground mb-1.5">Sources (comma-separated)</label>
                  <input
                    value={reportForm.sources}
                    onChange={(e) => setReportForm({ ...reportForm, sources: e.target.value })}
                    placeholder="e.g., NDDC Report 2023, Local News"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground font-ui text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Report
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

export default Environment;
