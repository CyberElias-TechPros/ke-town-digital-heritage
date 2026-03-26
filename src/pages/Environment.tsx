import { motion } from "framer-motion";
import { AlertTriangle, Fish, FileText, ExternalLink, Leaf, Droplets } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import envImg from "@/assets/environment-mangrove.jpg";

const impactStats = [
  { label: "Fish Species at Risk", value: "270+", icon: Fish },
  { label: "Annual Rainfall", value: "1,862mm", icon: Droplets },
  { label: "Oil Pipelines Nearby", value: "Multiple", icon: AlertTriangle },
  { label: "Ecosystem Type", value: "Mangrove", icon: Leaf },
];

const spills = [
  { year: "Ongoing", location: "Ke Town / Bille Area", impact: "Burnt vegetation from illegal bunkering fires. Pipeline infrastructure (FUGRO codes SANBT001, KRAKTL001) traverses the region.", status: "Active" },
  { year: "Recent", location: "Niger Delta Region", impact: "Significant environmental degradation from oil exploration. Fishermen report declining catches.", status: "Documented" },
];

const resources = [
  { name: "NDDC", full: "Niger Delta Development Commission", desc: "Federal agency for Niger Delta development and remediation", url: "#" },
  { name: "HYPREP", full: "Hydrocarbon Pollution Remediation Project", desc: "UNEP-backed program for environmental cleanup in Ogoniland and surrounding areas", url: "#" },
  { name: "NOSDRA", full: "National Oil Spill Detection & Response Agency", desc: "Nigerian agency responsible for oil spill detection, monitoring, and response", url: "#" },
];

const Environment = () => {
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
          <SectionHeading title="Environmental Impact" subtitle="Documenting the effects of oil infrastructure on our community" />
          <div className="space-y-6">
            {spills.map((spill, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle size={18} className="text-destructive" />
                    <span className="tag-ke bg-destructive/10 text-destructive">{spill.status}</span>
                    <span className="text-xs font-ui text-muted-foreground">{spill.year}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{spill.location}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{spill.impact}</p>
                </div>
              </AnimatedCard>
            ))}
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
    </Layout>
  );
};

export default Environment;
