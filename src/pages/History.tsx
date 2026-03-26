import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import historyImg from "@/assets/history-canoe.jpg";

const timelineEvents = [
  { year: "Pre-15th C", title: "Ancient Settlement", desc: "Ke Town established as one of the oldest Kalabari settlements in the Niger Delta, predating the main Kalabari migration to Elem-Kalabari." },
  { year: "15th-17th C", title: "European Contact Era", desc: "Kalabari people engage in trade with Portuguese and later Dutch merchants. War canoe houses emerge as political and economic units." },
  { year: "18th Century", title: "Height of Trade", desc: "The Kalabari Kingdom becomes a major trading power in the Niger Delta, dealing in palm oil, fish, and later slaves with European powers." },
  { year: "1850s", title: "Robinson Report", desc: "Justice Robinson's report confirms Ke Town existed before the main Kalabari migration, establishing its ancient status." },
  { year: "1935", title: "Colonial Intelligence Report", desc: "British colonial administration documents Kalabari chieftaincy system, including war canoe houses and traditional governance." },
  { year: "1960s", title: "Modern Governance", desc: "Degema LGA created. Ke Town falls under Degema local government administration within Rivers State." },
  { year: "Present", title: "Cultural Revival", desc: "Active community efforts to preserve Kalabari heritage, document oral histories, and connect diaspora worldwide." },
];

const wariHouses = [
  { name: "Kemsaipruye-Igbo", desc: "The historic group of houses in Ke Town, one of the major war canoe house lineages. Led by the paramount head." },
  { name: "Ekine Society", desc: "The masquerade society central to Kalabari cultural life, performing sacred dances and rituals during festivals." },
  { name: "Council of Chiefs", desc: "The traditional governing body led by the Amanyanabo (king) and senior chiefs from ruling houses." },
];

const notables = [
  { name: "Alhaji Daud Oduboye Peniel", role: "Paramount Head, Kemsaipruye-Igbo Houses", desc: "Community leader advocating for unity and development of Ke Town." },
  { name: "Amachree Dynasty", role: "Royal Lineage", desc: "The traditional royal house of the wider Kalabari Kingdom, representing centuries of monarchical governance." },
];

const History = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 opacity-20">
          <img src={historyImg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">History & Origins</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              The Story of <span className="text-gradient-gold">Ke Town</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              From ancient riverine settlements to a proud Kalabari community — centuries of heritage, governance, and cultural identity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Timeline of Ke Town" subtitle="Key milestones in our community's journey" />
          <div className="relative">
            {/* Center line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-px" />
            
            <div className="space-y-8 md:space-y-12">
              {timelineEvents.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col md:flex-row items-start gap-4 md:gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"} pl-12 md:pl-0`}>
                    <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)] hover-lift">
                      <span className="tag-ke bg-secondary/10 text-secondary mb-3 inline-block">{event.year}</span>
                      <h3 className="font-display text-xl font-bold text-foreground mb-2">{event.title}</h3>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">{event.desc}</p>
                    </div>
                  </div>
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 top-6 md:top-8 w-3 h-3 rounded-full bg-secondary border-2 border-background -translate-x-1/2 z-10" />
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* War Canoe Houses */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="The War Canoe House System" subtitle="The Wari system — the foundation of Kalabari political and social organization" />
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {wariHouses.map((house, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-ke-gold/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">⛵</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">{house.name}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{house.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-8 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-2xl font-bold text-foreground mb-4">About the Wari System</h3>
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              The War Canoe House (Wari) system was the fundamental political unit of Kalabari society. Each house was a semi-autonomous unit led by a chief, with its own members, wealth, and war canoes. These houses competed for trade, prestige, and political influence in the Niger Delta.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed">
              In Ke Town, the <strong className="text-foreground">Kemsaipruye-Igbo group of houses</strong> represents one of these historic lineages, maintaining the traditions and governance structure established centuries ago. The paramount head leads the group, serving as custodian of traditions and advocate for the community's interests.
            </p>
          </div>
        </div>
      </section>

      {/* Notable People */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Notable Figures" subtitle="Leaders and custodians of Ke Town heritage" />
          <div className="grid md:grid-cols-2 gap-6">
            {notables.map((person, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-ke-deep/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{person.name}</h3>
                    <span className="text-xs font-ui text-secondary font-medium">{person.role}</span>
                    <p className="text-sm text-muted-foreground font-body mt-2">{person.desc}</p>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Oral Traditions */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Oral Traditions Archive
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              We are actively collecting and preserving the oral histories of Ke Town. Share your family stories, memories, and recordings to help build our community archive.
            </p>
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]">
              Contribute Your Story
            </a>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default History;
