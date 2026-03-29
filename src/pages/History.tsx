import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import historyImg from "@/assets/history-canoe.jpg";

const timelineEvents = [
  { year: "~800 AD", title: "Archaeological Settlement", desc: "Radiocarbon dating of shell middens and pottery fragments confirms continuous occupation of the Ke area for over a millennium — among the oldest documented human settlements in the eastern Niger Delta." },
  { year: "Pre-AD 1000", title: "Ke & Angulama — The Two Originals", desc: "According to oral historian Chief Young Obene Clarke Georgewill (2015), Ke and Angulama were the only two indigenous communities already present in Kalabari territory, speaking what would become the Kalabari language. Every other major Kalabari city arrived later as immigrants." },
  { year: "Ancient Era", title: "The Seven Sobiriapu Found Ke", desc: "Seven mystics ('men of supernatural powers from heaven') descended from the sky using an African python as a ladder. Keni-Opu Ala (Keni the Great Lord), a priest of the Adumu spiritual lodge, gave the settlement its name 'Ke.' The Adumu Spiritual Initiation Lodge was established — the source of all Kalabari water-spirit masquerade traditions." },
  { year: "15th–16th C", title: "Immigrants Adopt the Kalabari Language", desc: "Major immigrant communities arrive from Benin Kingdom and elsewhere, speaking Edo and other languages. They settle at Elem Kalabari (Old Shipping) and are compelled to adopt the language of pre-existing Ke and Angulama — making Ke one of the linguistic foundations of the entire Kalabari nation." },
  { year: "Before 1699", title: "Atlantic Trade Era Begins", desc: "King Owerri Daba establishes the Duke Monmouth and Duke Africa trading houses. Kalabari enters the Atlantic slave trade. European traders nickname the Kalabari 'Englishmen' for their civilized and structured trade conduct." },
  { year: "1669–1757", title: "King Amachree I — The Empire Builder", desc: "Amachree I (Dabaye Amakiri), originally from Emakalakala in Ogbia, founds the Amachree dynasty. He formally integrates Ke into the Kalabari Kingdom circa 1765 through 'cultural and religious affiliations' (Alagoa, 1972) — a fundamentally different relationship than communities brought in by conquest." },
  { year: "~1765", title: "Ke Integrated by Affiliation, Not Conquest", desc: "Per academic historian Alagoa: Amachree I extended jurisdiction to 'Ifoko and Ke through cultural and religious affiliations.' Meanwhile Elem Bakana, Bukuma, Obonoma and Degema were brought in through conquest. Ke enters the Kingdom as a respected cultural peer." },
  { year: "18th Century", title: "Height of Trade", desc: "The Kalabari Kingdom becomes a major trading power in the Niger Delta, dealing in palm oil, fish, and slaves with European powers. Degema near Ke becomes a major palm oil export port." },
  { year: "1850s", title: "Robinson Report", desc: "Justice Robinson's report confirms Ke Kingdom existed before the main Kalabari migration, establishing its ancient status in official colonial records." },
  { year: "1881–1884", title: "The Great Dispersal — Ke Stays", desc: "Internal Kalabari rivalry leads to the founding of Bakana (1881), Abonnema (1882), and Buguma (1884) as groups leave Elem Kalabari. Ke remains in place — it was never part of this migration, having been there centuries before." },
  { year: "1932", title: "Talbot Documents 61 Rulers", desc: "British ethnographer Talbot records a line of 61 Amayanabos (kings) of Ke starting from Omoniye, through local historian Madam Kala-Dokku — establishing one of the longest documented royal lineages in the Niger Delta." },
  { year: "1935", title: "Colonial Intelligence Report", desc: "British colonial administration documents Kalabari chieftaincy system, including war canoe houses and traditional governance structures." },
  { year: "1960s", title: "Modern Governance", desc: "Degema LGA created. Ke Kingdom falls under Degema local government administration within Rivers State. Oil era begins transforming the Niger Delta economy." },
  { year: "2003", title: "Amachree XI Passes — Regency Begins", desc: "King Amachree XI (Prof. Theophilus Princewill CFR) passes. The Kalabari Kingdom enters a long regency under Dr. C.I.T. Numbere — the longest interregnum in modern Kalabari history." },
  { year: "Aug 2020", title: "HRM King Omoni XIII Crowned", desc: "HRM King Agolia Cookey Aboko Omoni XIII is crowned Amayanabo of Ke Kingdom — a former Member of Parliament, JP, now leading the community." },
  { year: "Dec 2024", title: "Asari Dokubo Installed at Elem Kalabari", desc: "Alhaji Mujahid Abubakar Dokubo-Asari installed as Dabaye Amakiri I at Elem Kalabari (The Source), returning to the ancestral seat after 140 years. A major symbolic revival for the entire Kalabari nation." },
  { year: "2025", title: "Ke vs Bille — Active Court Case", desc: "Asari Dokubo confirms: 'Bille is in court with Ke.' A long-running territorial boundary dispute over creeks and fishing grounds continues." },
  { year: "Present", title: "Cultural Revival", desc: "Active community efforts to preserve Kalabari heritage, document oral histories, and connect diaspora worldwide. Ke Kingdom remains one of the most historically significant yet under-documented communities in Nigeria." },
];

const wariHouses = [
  { name: "Kemsaipruye-Igbo", desc: "The historic group of houses in Ke Kingdom, one of the major war canoe house lineages. Led by the paramount head." },
  { name: "Ekine Society", desc: "The masquerade society central to Kalabari cultural life, performing sacred dances and rituals during festivals." },
  { name: "Council of Chiefs", desc: "The traditional governing body led by the Amanyanabo (king) and senior chiefs from ruling houses." },
];

const notables = [
  { name: "The Seven Sobiriapu", role: "Founding Ancestors", desc: "Seven mystics who descended from the sky using a python as a ladder. Keni-Opu Ala gave the settlement its name 'Ke' and established the Adumu Spiritual Initiation Lodge — the source of all Kalabari water-spirit masquerade traditions." },
  { name: "HRM King Agolia Cookey Aboko Omoni XIII", role: "Current Amayanabo of Ke Kingdom", desc: "Crowned August 15, 2020. A former Member of Parliament (Rt. Hon.) and JP, he is the 61st documented ruler in a lineage stretching back to Omoniye, recorded by Talbot in 1932." },
  { name: "Alhaji Daud Oduboye Peniel", role: "Paramount Head, Kemsaipruye-Igbo Houses", desc: "Community leader advocating for unity and development of Ke Kingdom. Head of the historic war canoe house lineage." },
  { name: "Amachree I (Dabaye Amakiri)", role: "Founder of Amachree Dynasty", desc: "Reigned 1669–1757. Integrated Ke into the Kalabari Kingdom through cultural and religious affiliations — not conquest. Originally from Emakalakala in Ogbia." },
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
              The Story of <span className="text-gradient-gold">Ke Kingdom</span>
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
          <SectionHeading title="Timeline of Ke Kingdom" subtitle="Key milestones in our community's journey" />
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

      {/* Ke's Unique Position */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Ke's Unique Position" subtitle="Not just another Kalabari town — one of the two ancient foundations of the Kalabari nation" />
          <div className="bg-card rounded-xl border border-border p-8 shadow-[var(--shadow-card)] mb-8">
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              According to Chief Young Obene Clarke Georgewill (2015) and corroborated by multiple Kalabari oral historians, <strong className="text-foreground">Ke is one of only TWO original indigenous communities</strong> in the entire Kalabari territory — the other being Angulama in the North. Every other major Kalabari city (Buguma, Abonnema, Bakana) was founded by immigrants who arrived in the 15th–16th centuries.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              The <strong className="text-foreground">Ekine-Sekiapu masquerade society</strong> — the most important cultural institution in all of Kalabari land, which gates chieftaincy and enforces law — was originally owned by Angulama and Ke. It later spread to other communities across the Kingdom. This makes Ke one of the cultural wellsprings of Kalabari civilization itself.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed">
              Unlike Angulama, which was reduced by wars with Agbaniye Ejike of Bille, Ke has maintained continuous occupation. Its name does not end in "-ma" or "-na" — a pre-immigration naming convention that linguists associate with the oldest Kalabari settlements.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <AnimatedCard delay={0}>
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🗣️</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Language Origin</h3>
                <p className="text-sm text-muted-foreground font-body">Ke and Angulama spoke what became the Kalabari language. Immigrants were compelled to adopt it.</p>
              </div>
            </AnimatedCard>
            <AnimatedCard delay={0.1}>
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🎭</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Masquerade Source</h3>
                <p className="text-sm text-muted-foreground font-body">The Ekine-Sekiapu society was originally owned by Ke and Angulama before spreading across the Kingdom.</p>
              </div>
            </AnimatedCard>
            <AnimatedCard delay={0.2}>
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Integration by Choice</h3>
                <p className="text-sm text-muted-foreground font-body">Ke joined the Kalabari Kingdom through cultural and religious affiliations — never conquered.</p>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Founding Myth */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="The Founding Myth" subtitle="Oral traditions of Ke's ancient origins — passed down through generations" />
          <div className="bg-card rounded-xl border border-border p-8 shadow-[var(--shadow-card)] mb-8">
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              Kalabari oral traditions describe Ke as founded by <strong className="text-foreground">seven Sobiriapu</strong> — mystics or "men of supernatural powers/gift from heaven." These ancestors descended from the sky using an <strong className="text-foreground">African python as a ladder or rope</strong>, a motif echoing other African creation myths.
            </p>
            <p className="text-muted-foreground font-body leading-relaxed">
              Archaeological evidence dates settlement to <strong className="text-foreground">at least 800 AD</strong>. Ke is regarded as the "Mother Settlement" of the Ijos in the eastern Niger Delta and the original base of the <strong className="text-foreground">Adumu Spiritual Initiation Lodge</strong>, linked to water spirits (Owu-ame mask spirits), which later spread across the delta.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Keni-Opu Ala", title: "The Great Lord", desc: "Priest of the Adumu lodge. Sent by Adumu (a water deity). The town's name 'Ke' derives from him." },
              { name: "Opu Ogbu", title: "Sky Ancestor", desc: "One of the seven mystics who descended using the python ladder." },
              { name: "Opu Jaja", title: "Sky Ancestor", desc: "Founding mystic who helped establish the settlement's spiritual laws." },
              { name: "Ombiye, Ogbokiya, Opupiri, Opusiri", title: "The Four Others", desc: "The remaining four Sobiriapu who completed the founding council of seven." },
            ].map((ancestor, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-ke-gold/10 flex items-center justify-center mb-3">
                    <span className="text-xl">🐍</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1">{ancestor.name}</h3>
                  <span className="text-xs font-ui text-secondary">{ancestor.title}</span>
                  <p className="text-sm text-muted-foreground font-body mt-2">{ancestor.desc}</p>
                </div>
              </AnimatedCard>
            ))}
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
              In Ke Kingdom, the <strong className="text-foreground">Kemsaipruye-Igbo group of houses</strong> represents one of these historic lineages, maintaining the traditions and governance structure established centuries ago. The paramount head leads the group, serving as custodian of traditions and advocate for the community's interests.
            </p>
          </div>
        </div>
      </section>

      {/* Notable People */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Notable Figures" subtitle="Leaders and custodians of Ke Kingdom heritage" />
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
              We are actively collecting and preserving the oral histories of Ke Kingdom. Share your family stories, memories, and recordings to help build our community archive.
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
