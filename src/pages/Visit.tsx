import { motion } from "framer-motion";
import { MapPin, Clock, Ship, Compass, BookOpen, Sun, CloudRain, Thermometer } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import SEO from "@/components/PageSEO";
import InteractiveMap from "@/components/InteractiveMap";
import heroImg from "@/assets/hero-waterway.jpg";

const travelInfo = [
  { icon: MapPin, title: "Location", desc: "Ke Kingdom, Degema LGA, Rivers State, Nigeria. Located in the eastern Niger Delta waterway system." },
  { icon: Ship, title: "Getting There", desc: "From Port Harcourt (~27km east), travel by road to Degema, then by boat through the waterways to Ke Kingdom." },
  { icon: Clock, title: "Best Time", desc: "Dry season (November–March) offers calmer waters and festival season. Rainy season (April–October) brings lush greenery." },
  { icon: Compass, title: "Duration", desc: "Plan for at least 2–3 days to fully experience the community, waterways, and cultural activities." },
];

const climate = [
  { icon: Thermometer, label: "Temperature", value: "25–28°C avg" },
  { icon: CloudRain, label: "Rainfall", value: "~1,862mm/yr" },
  { icon: Sun, label: "Humidity", value: "~89%" },
];

const etiquette = [
  "Greet elders first and show respect — address chiefs by their titles",
  "Ask permission before photographing masquerades or sacred ceremonies",
  "Some masquerade knowledge is restricted — do not photograph sacred Ekine rituals without explicit permission from the Opu Edi (head of Ekine)",
  "The python is a sacred totem of the Adumu Lodge — do not harm or show fear toward pythons in the community",
  "Dress modestly when visiting community events or church services",
  "Remove shoes before entering homes and sacred spaces",
  "Accept food and drink offerings graciously — it's a sign of hospitality",
  "Learn basic Kalabari greetings: 'Ibote!' (Hello) and 'A ro sin te oo!' (Welcome!)",
  "Do not point at masquerades or elders — use an open hand to indicate direction",
];

const experiences = [
  { name: "Canoe Tours", desc: "Navigate the mangrove waterways in traditional wooden canoes with local guides. The 42-mile Boler Creek route to Bonny is one of the most historic waterways.", icon: "🛶" },
  { name: "Fishing Experiences", desc: "Join local fishermen on the creeks for a traditional fishing excursion. Over 270 fish species inhabit the local waters.", icon: "🎣" },
  { name: "Festival Attendance", desc: "Witness the spectacular Owu-Aru-Sun masquerade festival and cultural celebrations. The Kalabari New Year (Nov 16th) is another major event.", icon: "🎭" },
  { name: "Sacred Shrines Visit", desc: "Visit ancestral Inkpu shrines and water deity sites along the creeks. These sacred spaces connect the living to ancestors and water spirits.", icon: "🏛️" },
  { name: "Adumu Lodge Heritage", desc: "Learn about Ke's role as the fountainhead of the Adumu Spiritual Initiation Lodge — the source of all Kalabari water-spirit masquerade traditions.", icon: "🐍" },
  { name: "Cultural Workshops", desc: "Learn about George fabric weaving, local cuisine preparation (Onunu, Fisherman's Soup), and traditional arts.", icon: "🎨" },
  { name: "Heritage Walk", desc: "Guided tour of historic sites, the Amanyanabo's palace, and community landmarks including sites dating to 800 AD.", icon: "🚶" },
  { name: "Market Visit", desc: "Experience the local market with fresh catches, palm oil, and handcrafted goods — a tradition spanning centuries of Niger Delta commerce.", icon: "🏪" },
];

const Visit = () => {
  return (
    <Layout>
      <SEO page="/visit" />
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(160 37% 16% / 0.6) 0%, hsl(160 37% 16% / 0.9) 100%)" }} />
        </div>
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">Visit Ke Kingdom</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Discover the <span className="text-gradient-gold">Waterways</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              A travel guide to the Niger Delta's hidden gem — how to reach Ke Kingdom, what to experience, and cultural etiquette for visitors.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Travel Info */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Getting to Ke Kingdom" subtitle="Essential information for planning your visit" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {travelInfo.map((info, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-ke-water/10 flex items-center justify-center mx-auto mb-4">
                    <info.icon size={24} className="text-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{info.title}</h3>
                  <p className="text-sm text-muted-foreground font-body">{info.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Climate */}
      <section className="py-10 bg-muted/50">
        <div className="container-narrow px-4 md:px-8">
          <div className="flex flex-wrap justify-center gap-8">
            {climate.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <item.icon size={20} className="text-secondary" />
                <div>
                  <div className="text-xs font-ui text-muted-foreground">{item.label}</div>
                  <div className="font-display font-bold text-foreground">{item.value}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiences */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Experiences" subtitle="What awaits you in Ke Kingdom" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, i) => (
              <AnimatedCard key={i} delay={i * 0.1}>
                <div className="p-6">
                  <span className="text-3xl mb-3 inline-block">{exp.icon}</span>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{exp.name}</h3>
                  <p className="text-sm text-muted-foreground font-body">{exp.desc}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Map */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Location Map" subtitle="Explore Ke Kingdom and the surrounding Niger Delta waterways" />
          <InteractiveMap
            locations={[
              {
                name: "Ke Kingdom",
                lat: 4.7833,
                lng: 6.8167,
                description: "Main settlement in Degema LGA — one of the two original Kalabari communities",
                type: "town",
              },
              {
                name: "Kalaekuleama",
                lat: 4.79,
                lng: 6.81,
                description: "Constituent community of Ke Kingdom",
                type: "town",
              },
              {
                name: "Degema",
                lat: 4.75,
                lng: 6.85,
                description: "Local Government Area headquarters",
                type: "landmark",
              },
              {
                name: "Elem Kalabari (Old Shipping)",
                lat: 4.76,
                lng: 6.82,
                description: "Ancestral seat of the Kalabari Kingdom — recently revived under Asari Dokubo",
                type: "landmark",
              },
              {
                name: "New Calabar River",
                lat: 4.8,
                lng: 6.8,
                description: "Major waterway system connecting to Port Harcourt",
                type: "waterway",
              },
              {
                name: "Bille Creek",
                lat: 4.7667,
                lng: 6.8333,
                description: "Traditional fishing area — subject of active court case with Ke Kingdom",
                type: "waterway",
              },
              {
                name: "Kra-kra Creek",
                lat: 4.8167,
                lng: 6.7833,
                description: "Mangrove waterway — traditional fishing grounds",
                type: "waterway",
              },
            ]}
            center={{ lat: 4.7833, lng: 6.8167 }}
            zoom={12}
            height="450px"
          />
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-body">
              Ke Kingdom is located at approximately 4.78°N, 6.82°E in the Niger Delta region.
              <br />
              Click on markers to learn more about each location.
            </p>
          </div>
        </div>
      </section>

      {/* Etiquette */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading title="Cultural Etiquette" subtitle="Show respect and appreciation for Kalabari traditions" />
          <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-8 shadow-[var(--shadow-card)]">
            <ul className="space-y-4">
              {etiquette.map((rule, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-secondary text-xs font-ui font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">{rule}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Visit;
