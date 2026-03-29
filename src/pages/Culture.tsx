import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import AudioPhrasebook from "@/components/AudioPhrasebook";
import cultureImg from "@/assets/culture-masquerade.jpg";
import attireImg from "@/assets/attire-george.jpg";
import cuisineImg from "@/assets/cuisine-onunu.jpg";

const tabs = ["Festivals", "Masquerades", "Attire", "Cuisine", "Marriage", "Language", "Spirituality"];

const festivals = [
  { name: "Owu-Aru-Sun Alali", desc: "The grand masquerade festival — ancestral commemoration through elaborate masked performances, drumming, and community feasting. Water spirits (Owu) are central to the celebration. Major events held in Buguma (1908, 1927, 1973, 1991, 2013). Owu are ritually returned to the sea after the festival.", type: "Masquerade" },
  { name: "Ama Agba", desc: "The annual town purification ritual held every November 15th to protect against flooding. The Ngbula masquerade emerges at midnight to cleanse the town of evil. A defining event in the Kalabari ceremonial calendar.", type: "Sacred" },
  { name: "Kalabari New Year Festival", desc: "Celebrated on November 16th annually. Marked by a unique tidal phenomenon where the Sombrero River's pollution is flushed by saline waters — a spiritual cleansing symbolizing renewal. In 2025, the Kalabari Renaissance Foundation launched a unified celebration at Elem Kalabari with the theme 'Celebrating Our Heritage, Honouring Our Waters And Renewing Our Spirit.'", type: "Cultural" },
  { name: "Ekine Masquerade Season", desc: "The Ekine Sekiapu Society performs sacred masquerade dances representing water spirits and ancestors. Each mask tells a story of Kalabari cosmology. The dry season sees approximately 3 plays performed annually over a 15–20 year cycle.", type: "Sacred" },
  { name: "Canoe Regattas", desc: "Competitive boat races on the waterways, echoing the maritime traditions of the war canoe houses. Communities compete for honor and celebration.", type: "Sport" },
];

const masquerades = [
  { name: "Alagba", desc: "The first masquerade played before Owu-Aru-Sun — it must precede all others. A high-status masquerade with intricate headpieces, often led by prominent figures during major festivals.", icon: "🎭" },
  { name: "Ikaki (The Tortoise)", desc: "One of the most popular plays in Buguma, representing the wise but cunning tortoise. A direct export of Ke's spiritual drama tradition.", icon: "🐢" },
  { name: "Seki (The Crocodile)", desc: "A powerful masquerade that mimics the movements of a crocodile, emphasizing the kingdom's deep connection to riverine life.", icon: "🐊" },
  { name: "Otobo (The Hippopotamus)", desc: "Features massive carved wooden masks — some dating back to 1960 — that represent the strength of the water spirit.", icon: "🦛" },
  { name: "Obianama", desc: "A 'storytelling' masquerade known for its unique, stylish dancing and animal-eating rituals during performances.", icon: "💃" },
  { name: "Kalaise", desc: "Formerly the most significant masquerade in Ke, now nearly extinct due to its historically violent and unpredictable nature. A lost heritage worth preserving.", icon: "⚡" },
  { name: "Kalaekpesiaba (Tingolongo)", desc: "Known for its specific, rhythmic 'Tingolongo' style of play — a distinctive performance tradition.", icon: "🥁" },
  { name: "Ngbula", desc: "A purification masquerade that emerges at midnight during the Ama Agba ritual to cleanse the town of flooding and evil.", icon: "🌙" },
  { name: "Igbo", desc: "Represents a dashing, headstrong young man from the water world — combining fondness of women, conviviality, and style.", icon: "💫" },
  { name: "Tari Oboko & Ofor", desc: "The lead masquerades that appear solely during the Owu-Aru-Sun grand finale to escort the spirits back to the ocean. Tari Oboko is the first paddler; Ofor is the helmsman.", icon: "🛶" },
];

const attireItems = [
  { name: "George Fabric", desc: "The quintessential Kalabari textile — Indian-origin cotton with gold brocade that became synonymous with Kalabari identity. Worn as wrappers by both men and women, it represents wealth and prestige. Central to bridal wealth presentations.", img: attireImg },
  { name: "Etibo & Woko (Men)", desc: "The Etibo is a long-sleeved wax-cotton shirt with specific collar and placket details. The Woko is a long shirt with studs. Both are formal men's wear, paired with a bowler hat and walking stick (imkpara) — symbols of dignity and pride." },
  { name: "Bowler Hat & Wrapper (Men)", desc: "Distinguished Kalabari men wear bowler hats with George cloth wrappers — a unique fusion of European and African fashion born from centuries of maritime trade with Portuguese, Dutch, and English merchants." },
  { name: "Coral Bead Jewelry (Ikala)", desc: "Coral beads called 'Ikala' are layered in necklaces, bracelets, and earrings. They signify status, royalty, and cultural identity. Chiefs and elders wear elaborate coral pieces during ceremonies. Multiple layers are worn for major events." },
  { name: "Ajibulu & Headpieces (Women)", desc: "Women wear George/lace wrappers with matching blouse and shawl, topped with large head-ties or ornate Ajibulu headpieces. The overall look is one of layered elegance." },
  { name: "Loko Cloth", desc: "The highest-ranked traditional cloth in Kalabari culture. Reserved for the most prestigious occasions and ceremonies, it carries deep cultural significance." },
  { name: "Ekine Headdresses", desc: "Elaborate carved masks and headdresses featuring antelope, leopard, and fish motifs used in masquerade performances. Each design carries spiritual significance and is owned by specific houses." },
];

const cuisineItems = [
  { name: "Onunu", desc: "The iconic Kalabari delicacy — pounded yam and ripe plantain mixed with palm oil. The signature dish served at celebrations and ceremonies across all Kalabari communities.", img: cuisineImg },
  { name: "Tominafulo", desc: "A rich dish made with fresh fish, prawns, periwinkle, oyster, and local ingredients from the Niger Delta waterways. A celebration of the community's maritime bounty." },
  { name: "Odo'fulo (Native Soup)", desc: "Fresh seafood combined with local herbs in a thick, flavorful broth. The quintessential Kalabari comfort food — each family has their own recipe passed down through generations." },
  { name: "Fisherman's Soup", desc: "A rich, flavorful soup made with fresh catches from the local waterways — featuring periwinkles, crabs, and various fish species in a palm oil base. Over 270 fish species available in local waters." },
  { name: "Akamiri", desc: "Locally brewed gin distilled from palm wine. Used in ceremonies, chieftaincy installations, and social gatherings. An essential part of traditional hospitality." },
  { name: "Gbolokai", desc: "Another local gin variant, often served alongside Akamiri. Both spirits play important roles in libations and ceremonial toasts." },
];

const marriageSteps = [
  { step: 1, name: "Bibife", desc: "'Buying of the mouth' — the bride cannot eat in her husband's home until this ceremony is performed, signifying the husband's lifetime commitment to provide for her. The groom's family formally presents gifts to 'open the mouth.'" },
  { step: 2, name: "Idi Imiete", desc: "The bride's gift-giving ceremony — presentation of George fabric, coral beads, and other valuable items. A public display of the groom's family's wealth and诚意." },
  { step: 3, name: "Waribiobesime", desc: "An intermediate form of marriage ceremony — less elaborate than Igwa but more formal than Ari Ibara emi. Represents a recognized union within the community." },
  { step: 4, name: "Igwa Marriage", desc: "A formal marriage ceremony with traditional rites, feasting, and community celebration. Considered a fully recognized Kalabari marriage." },
  { step: 5, name: "Iya Marriage", desc: "The highest and most elaborate form of Kalabari marriage — introduced by King Amachree I. A prestigious ceremony that confers the highest social status. Among the least expensive major marriage forms in South-South Nigeria." },
  { step: 6, name: "Ari Ibara emi", desc: "The cheapest legal form of Kalabari marriage — literally 'she is with me.' A simple declaration that establishes a recognized union without elaborate ceremony." },
];

const phrases = [
  { id: "1", kalabari: "A ro sin te oo!", english: "Welcome!", context: "Greeting visitors", category: "Greetings", pronunciation: "ah-roh-sin-teh-oh" },
  { id: "2", kalabari: "Ibote", english: "Hello", context: "Standard greeting", category: "Greetings", pronunciation: "ee-boh-teh" },
  { id: "3", kalabari: "Ibosa / Iboa", english: "Hello (variants)", context: "Alternative greetings used across Kalabari", category: "Greetings", pronunciation: "ee-boh-sah / ee-boh-ah" },
  { id: "4", kalabari: "Kengemina Kalabari", english: "We are Kalabari", context: "Identity declaration", category: "Identity", pronunciation: "ken-geh-mee-nah-kah-lah-bah-ree" },
  { id: "5", kalabari: "Opu Ama", english: "Big Town / City", context: "Place reference", category: "Places", pronunciation: "oh-poo-ah-mah" },
  { id: "6", kalabari: "Igba Alabo", english: "Purification rites", context: "Spiritual ceremony", category: "Spirituality", pronunciation: "ee-gbah-ah-lah-boh" },
  { id: "7", kalabari: "Amanyanabo", english: "King / Owner of the Land", context: "Title of respect", category: "Titles", pronunciation: "ah-mahn-yah-nah-boh" },
  { id: "8", kalabari: "Wari", english: "War Canoe House", context: "Political/social unit", category: "Social Structure", pronunciation: "wah-ree" },
  { id: "9", kalabari: "Owu", english: "Water Spirits", context: "Spiritual beings", category: "Spirituality", pronunciation: "oh-woo" },
  { id: "10", kalabari: "Ekine", english: "Masquerade Society", context: "Cultural institution", category: "Culture", pronunciation: "eh-kee-neh" },
  { id: "11", kalabari: "Opu Edi", english: "Head of Ekine", context: "Supreme priest of the masquerade society", category: "Titles", pronunciation: "oh-poo eh-dee" },
  { id: "12", kalabari: "Otompolo", english: "A nobody", context: "One who is not a Sekibo (Ekine member)", category: "Social Structure", pronunciation: "oh-tom-poh-loh" },
  { id: "13", kalabari: "Omu-Aru", english: "War Canoe", context: "Military and ceremonial vessel", category: "Social Structure", pronunciation: "oh-moo ah-roo" },
  { id: "14", kalabari: "Bibife", english: "Buying of the mouth", context: "Marriage ceremony", category: "Marriage", pronunciation: "bee-bee-feh" },
  { id: "15", kalabari: "Iya", english: "Highest marriage form", context: "Prestigious ceremony", category: "Marriage", pronunciation: "ee-yah" },
  { id: "16", kalabari: "George", english: "Traditional fabric", context: "Cultural textile", category: "Attire", pronunciation: "jorj" },
  { id: "17", kalabari: "Onunu", english: "Yam and plantain dish", context: "Traditional cuisine", category: "Food", pronunciation: "oh-noo-noo" },
  { id: "18", kalabari: "Inkpu", english: "Ancestral shrines", context: "Sacred spaces for ancestor veneration", category: "Spirituality", pronunciation: "een-poo" },
  { id: "19", kalabari: "Dinkoru", english: "Wake night", context: "Night of songs, drumming, dancing before burial", category: "Customs", pronunciation: "deen-koh-roo" },
  { id: "20", kalabari: "Dinkrama", english: "Final funeral ceremony", desc: "Held 7-8 days after burial to reinforce clan ties", category: "Customs", pronunciation: "deen-krah-mah" },
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
              Masquerades, festivals, cuisine, attire, language, and spiritual life — the vibrant heart of Kalabari culture as practiced in Ke Kingdom.
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

              {activeTab === "Masquerades" && (
                <div>
                  <SectionHeading title="Masquerade Types" subtitle="Sacred performances originating from Ke Kingdom — the spiritual fountainhead of Kalabari mask culture" />
                  <div className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)] mb-8">
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                      Ke is the origin of the Adumu Spiritual Initiation Lodge, from which almost all Kalabari and Ijaw water-spirit masquerades (Owu-ame) trace their liturgical origins. Many of these masks were given to Buguma chiefs as "marriage gifts" from Ke princesses. During the Owu-Aru-Sun Festival, Ke's influence remains dominant.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {masquerades.map((mask, i) => (
                      <AnimatedCard key={i} delay={i * 0.05}>
                        <div className="p-6">
                          <span className="text-3xl mb-3 inline-block">{mask.icon}</span>
                          <h3 className="font-display text-lg font-semibold text-foreground mb-2">{mask.name}</h3>
                          <p className="text-sm text-muted-foreground font-body leading-relaxed">{mask.desc}</p>
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
                      { icon: "🐍", name: "Adumu Spiritual Lodge", desc: "The fountainhead of all Kalabari and Ijaw water-spirit masquerade traditions. Ke is the primary source — for centuries, other Delta communities had to send their initiates to Ke to 'receive the fire' and perform sacred rites. The python is its primary totem." },
                      { icon: "🌊", name: "Awoamenakaso (Akaso)", desc: "The mother of all Kalabari deities — a revered river goddess who strictly forbade war and bloodshed. Said to be 'sister' of Britannia. Water spirit beliefs are central to Kalabari cosmology and cultural identity." },
                      { icon: "🎭", name: "Owu (Water Spirits)", desc: "Masked performances representing water spirits that inhabit the creeks and rivers. The Ekine Society maintains these sacred traditions. Owu are ritually returned to the sea after the Owu-Aru-Sun festival." },
                      { icon: "⛪", name: "Christianity & Tradition", desc: "Modern Ke Kingdom practices syncretic Christianity (~90% Christian). Traditional practices coexist: Ekine masquerades are maintained by Christians. As King Amachree XI stated: 'The Alagba masquerade does not in any way conflict with the Christian faith.'" },
                      { icon: "🏛️", name: "Ancestral Shrines (Inkpu)", desc: "Sacred spaces honoring ancestors and community founders. These shrines serve as spiritual connection points between generations. New Year prayers at river shrines are still practiced." },
                      { icon: "💧", name: "Igba Alabo — Purification Rites", desc: "Traditional purification ceremonies performed at waterways. These rites cleanse individuals and the community, connecting the living to the water spirits and ancestors." },
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
