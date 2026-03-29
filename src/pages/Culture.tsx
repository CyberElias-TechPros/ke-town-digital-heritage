import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import AudioPhrasebook from "@/components/AudioPhrasebook";
import cultureImg from "@/assets/culture-masquerade.jpg";
import attireImg from "@/assets/attire-george.jpg";
import cuisineImg from "@/assets/cuisine-onunu.jpg";

const tabs = ["Festivals", "Attire", "Cuisine", "Marriage", "Language", "Spirituality"];

const festivals = [
  { name: "Owu-Aru-Sun Alali", desc: "The grand masquerade festival — ancestral commemoration through elaborate masked performances, drumming, and community feasting. Water spirits (Owu) are central to the celebration.", type: "Masquerade" },
  { name: "Kalabari New Year Festival", desc: "Celebrated annually at Elem-Kalabari, the spiritual center. All Kalabari communities unite for drumming, dance, and ancestral commemoration — a symbol of unity.", type: "Cultural" },
  { name: "Ekine Masquerade Season", desc: "The Ekine Sekiapu Society performs sacred masquerade dances representing water spirits and ancestors. Each mask tells a story of Kalabari cosmology.", type: "Sacred" },
  { name: "Canoe Regattas", desc: "Competitive boat races on the waterways, echoing the maritime traditions of the war canoe houses. Communities compete for honor and celebration.", type: "Sport" },
];

const attireItems = [
  { name: "George Fabric", desc: "The quintessential Kalabari textile — imported Indian madras cloth that became synonymous with Kalabari identity. Worn as wrappers by both men and women, it represents wealth and prestige.", img: attireImg },
  { name: "Bowler Hat & Wrapper (Men)", desc: "Distinguished Kalabari men wear bowler hats with George cloth wrappers — a unique fusion of European and African fashion born from centuries of trade." },
  { name: "Coral Bead Jewelry", desc: "Coral bead necklaces and accessories signify status, royalty, and cultural identity. Chiefs and elders wear elaborate coral pieces during ceremonies." },
  { name: "Ekine Headdresses", desc: "Elaborate carved masks and headdresses featuring antelope, leopard, and fish motifs used in masquerade performances. Each design carries spiritual significance." },
];

const cuisineItems = [
  { name: "Onunu", desc: "The iconic Kalabari delicacy — boiled yam and ripe plantain pounded together and served with rich palm oil. A staple at celebrations and ceremonies.", img: cuisineImg },
  { name: "Fisherman's Soup", desc: "A rich, flavorful soup made with fresh catches from the local waterways — featuring periwinkles, crabs, and various fish species in a palm oil base." },
  { name: "Akamiri & Gbolokai", desc: "Traditional local spirits (gin) distilled from palm wine. Served during ceremonies, chieftaincy events, and social gatherings." },
];

const marriageSteps = [
  { step: 1, name: "Bibife", desc: "'Buying of the mouth' — the initial marriage ceremony where the groom's family formally requests the bride's hand." },
  { step: 2, name: "Idi Imiete", desc: "The bride's gift-giving ceremony — presentation of George fabric, coral beads, and other valuable items." },
  { step: 3, name: "Igwa Marriage", desc: "A formal marriage ceremony with traditional rites, feasting, and community celebration." },
  { step: 4, name: "Iya Marriage", desc: "The highest and most elaborate form of Kalabari marriage — a prestigious ceremony that confers the highest social status." },
];

const phrases = [
  { id: "1", kalabari: "A ro sin te oo!", english: "Welcome!", context: "Greeting visitors", category: "Greetings", pronunciation: "ah-roh-sin-teh-oh" },
  { id: "2", kalabari: "Kengemina Kalabari", english: "We are Kalabari", context: "Identity declaration", category: "Identity", pronunciation: "ken-geh-mee-nah-kah-lah-bah-ree" },
  { id: "3", kalabari: "Opu Ama", english: "Big Town / City", context: "Place reference", category: "Places", pronunciation: "oh-poo-ah-mah" },
  { id: "4", kalabari: "Igba Alabo", english: "Purification rites", context: "Spiritual ceremony", category: "Spirituality", pronunciation: "ee-gbah-ah-lah-boh" },
  { id: "5", kalabari: "Amanyanabo", english: "King / Paramount Ruler", context: "Title of respect", category: "Titles", pronunciation: "ah-mahn-yah-nah-boh" },
  { id: "6", kalabari: "Wari", english: "War Canoe House", context: "Political/social unit", category: "Social Structure", pronunciation: "wah-ree" },
  { id: "7", kalabari: "Owu", english: "Water Spirits", context: "Spiritual beings", category: "Spirituality", pronunciation: "oh-woo" },
  { id: "8", kalabari: "Ekine", english: "Masquerade Society", context: "Cultural institution", category: "Culture", pronunciation: "eh-kee-neh" },
  { id: "9", kalabari: "Bibife", english: "Buying of the mouth", context: "Marriage ceremony", category: "Marriage", pronunciation: "bee-bee-feh" },
  { id: "10", kalabari: "Iya", english: "Highest marriage form", context: "Prestigious ceremony", category: "Marriage", pronunciation: "ee-yah" },
  { id: "11", kalabari: "George", english: "Traditional fabric", context: "Cultural textile", category: "Attire", pronunciation: "jorj" },
  { id: "12", kalabari: "Onunu", english: "Yam and plantain dish", context: "Traditional cuisine", category: "Food", pronunciation: "oh-noo-noo" },
];

const Culture = () => {
  const [activeTab, setActiveTab] = useState("Festivals");

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 opacity-20">
          <img src={cultureImg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Culture & Traditions</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Living <span className="text-gradient-gold">Heritage</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Masquerades, festivals, cuisine, attire, language, and spiritual life — the vibrant heart of Kalabari culture as practiced in Ke Town.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="flex overflow-x-auto gap-2 mb-12 pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full font-ui text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "Festivals" && (
                <div>
                  <SectionHeading title="Festivals & Ceremonies" subtitle="Sacred celebrations that bind the community together" />
                  <div className="grid md:grid-cols-2 gap-6">
                    {festivals.map((fest, i) => (
                      <AnimatedCard key={i} delay={i * 0.1}>
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🎭</span>
                            <span className="tag-ke bg-secondary/10 text-secondary">{fest.type}</span>
                          </div>
                          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{fest.name}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{fest.desc}</p>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "Attire" && (
                <div>
                  <SectionHeading title="Traditional Attire" subtitle="George fabric, coral beads, and the distinctive Kalabari style" />
                  <div className="grid md:grid-cols-2 gap-6">
                    {attireItems.map((item, i) => (
                      <AnimatedCard key={i} delay={i * 0.1}>
                        <div className="p-6">
                          {item.img && (
                            <img src={item.img} alt={item.name} loading="lazy" width={800} height={1024} className="w-full h-48 object-cover rounded-lg mb-4" />
                          )}
                          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{item.name}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "Cuisine" && (
                <div>
                  <SectionHeading title="Kalabari Cuisine" subtitle="Flavors of the Niger Delta — from Onunu to Fisherman's Soup" />
                  <div className="grid md:grid-cols-3 gap-6">
                    {cuisineItems.map((item, i) => (
                      <AnimatedCard key={i} delay={i * 0.1}>
                        <div className="p-6">
                          {item.img && (
                            <img src={item.img} alt={item.name} loading="lazy" width={800} height={800} className="w-full h-48 object-cover rounded-lg mb-4" />
                          )}
                          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{item.name}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "Marriage" && (
                <div>
                  <SectionHeading title="Marriage Ceremonies" subtitle="From Bibife to Iya — the steps of Kalabari matrimony" />
                  <div className="max-w-2xl mx-auto space-y-6">
                    {marriageSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 items-start"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-ui font-bold text-sm flex-shrink-0">
                          {step.step}
                        </div>
                        <div className="bg-card rounded-xl border border-border p-5 flex-1 shadow-[var(--shadow-card)]">
                          <h3 className="font-display text-lg font-semibold text-foreground mb-1">{step.name}</h3>
                          <p className="text-sm text-muted-foreground font-body">{step.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "Language" && (
                <div>
                  <AudioPhrasebook
                    phrases={phrases}
                    title="Kalabari Phrasebook"
                    subtitle="Learn basic phrases in the Kalabari (Awome) language with audio pronunciation"
                  />
                </div>
              )}

              {activeTab === "Spirituality" && (
                <div>
                  <SectionHeading title="Spirituality & Beliefs" subtitle="Water spirits, ancestral worship, and syncretic Christianity" />
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { icon: "🌊", name: "Awoamenakaso", desc: "The revered river goddess of the Kalabari people. Water spirit beliefs are central to Kalabari cosmology and cultural identity." },
                      { icon: "🎭", name: "Owu (Water Spirits)", desc: "Masked performances representing water spirits that inhabit the creeks and rivers. The Ekine Society maintains these sacred traditions." },
                      { icon: "⛪", name: "Christianity & Tradition", desc: "Modern Ke Town practices syncretic Christianity, blending Christian worship with traditional Kalabari spiritual beliefs and ceremonies." },
                      { icon: "🏛️", name: "Ancestral Shrines (Inkpu)", desc: "Sacred spaces honoring ancestors and community founders. These shrines serve as spiritual connection points between generations." },
                    ].map((item, i) => (
                      <AnimatedCard key={i} delay={i * 0.1}>
                        <div className="p-6">
                          <span className="text-3xl mb-3 inline-block">{item.icon}</span>
                          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{item.name}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                        </div>
                      </AnimatedCard>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
};

export default Culture;
