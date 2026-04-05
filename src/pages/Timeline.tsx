import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, Anchor, Crown, Heart } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import SEO from "@/components/PageSEO";

interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  category: "settlement" | "political" | "cultural" | "conflict" | "colonial" | "modern";
  location?: string;
}

const timelineEvents: TimelineEvent[] = [
  {
    year: "800 AD",
    title: "Earliest Settlement",
    description: "Archaeological evidence dates human settlement in Ke Kingdom to at least 800 AD, making it one of the oldest documented human settlements in the eastern Niger Delta.",
    category: "settlement",
    location: "Ke Kingdom"
  },
  {
    year: "Pre-1500s",
    title: "Founding of Ke and Angulama",
    description: "Ke and Angulama are established as the two original indigenous communities in all of Kalabari territory. Every other major Kalabari city arrived later as immigrants.",
    category: "settlement",
    location: "Niger Delta"
  },
  {
    year: "1500s-1600s",
    title: "Rise of the War Canoe Houses",
    description: "The famous war canoe house (Wari) system develops, with Ke holding the Kemsaipruye-Igbo group of houses. These houses become the political and military backbone of Kalabari society.",
    category: "political",
    location: "Kalabari"
  },
  {
    year: "Early 1600s",
    title: "Development of Ekine Tradition",
    description: "Ke gives the Kalabari nation its Ekine masquerade tradition, which becomes one of the most elaborate performative arts in the Niger Delta.",
    category: "cultural",
    location: "Ke Kingdom"
  },
  {
    year: "1600s-1800s",
    title: "Maritime Trade Era",
    description: "Kalabari becomes a major trading hub, dealing with Portuguese, Dutch, and English merchants. The famous bowler hat and George fabric tradition emerges from this contact.",
    category: "cultural",
    location: "Kalabari Coast"
  },
  {
    year: "1700s",
    title: "Development of Kalabari Language",
    description: "The Kalabari (Awome) language is codified and becomes the basis for what would later influence neighboring Ijaw languages.",
    category: "cultural",
    location: "Ke Kingdom"
  },
  {
    year: "1840s",
    title: "First Missionaries Arrive",
    description: "Christian missionaries begin arriving in the region, bringing new religious practices while traditional spirituality remains strong.",
    category: "cultural",
    location: "Kalabari"
  },
  {
    year: "1884",
    title: "British Protectorate",
    description: "The Niger Coast Protectorate is established; Kalabari territories come under British colonial administration.",
    category: "colonial",
    location: "Niger Delta"
  },
  {
    year: "1900",
    title: "Indirect Rule System",
    description: "British colonial authorities implement indirect rule through traditional rulers, including the King of Kalabari.",
    category: "colonial",
    location: "Kalabari"
  },
  {
    year: "1908",
    title: "First Owu-Aru-Sun Festival",
    description: "The grand Owu-Aru-Sun Alali masquerade festival is recorded in Buguma, beginning a tradition of major周期性 gatherings.",
    category: "cultural",
    location: "Buguma"
  },
  {
    year: "1914",
    title: "Southern Nigeria Merges",
    description: "Southern Nigeria is consolidated under British administration; local governance structures are formalized.",
    category: "colonial",
    location: "Nigeria"
  },
  {
    year: "1927",
    title: "Second Owu-Aru-Sun",
    description: "The second recorded grand masquerade festival takes place in Buguma, continuing the tradition of ancestral commemoration.",
    category: "cultural",
    location: "Buguma"
  },
  {
    year: "1940s",
    title: "Early Nationalism",
    description: "Kalabari intellectuals begin organizing, laying groundwork for post-independence political consciousness.",
    category: "political",
    location: "Kalabari"
  },
  {
    year: "1960",
    title: "Nigerian Independence",
    description: "Nigeria gains independence; Kalabari leaders begin more active participation in national politics.",
    category: "political",
    location: "Nigeria"
  },
  {
    year: "1967",
    title: "Civil War Begins",
    description: "The Nigerian Civil War (Biafran War) begins; the Niger Delta, including Kalabari, is affected by conflict.",
    category: "conflict",
    location: "Niger Delta"
  },
  {
    year: "1970",
    title: "Civil War Ends",
    description: "The civil war ends; reconstruction and development begin in the region.",
    category: "modern",
    location: "Nigeria"
  },
  {
    year: "1973",
    title: "Third Owu-Aru-Sun",
    description: "The third grand masquerade festival is held in Buguma.",
    category: "cultural",
    location: "Buguma"
  },
  {
    year: "1976",
    title: "Local Government Creation",
    description: "Degema Local Government Area is created, formalizing administrative boundaries for Ke Kingdom and surrounding communities.",
    category: "political",
    location: "Degema LGA"
  },
  {
    year: "1991",
    title: "Fourth Owu-Aru-Sun",
    description: "The fourth recorded grand masquerade festival continues the tradition.",
    category: "cultural",
    location: "Buguma"
  },
  {
    year: "1999",
    title: "Return to Democracy",
    description: "Nigeria returns to democratic rule; increased focus on local development and cultural preservation.",
    category: "modern",
    location: "Nigeria"
  },
  {
    year: "2013",
    title: "Fifth Owu-Aru-Sun",
    description: "The fifth grand masquerade festival is held, showing continuity of tradition.",
    category: "cultural",
    location: "Buguma"
  },
  {
    year: "2015",
    title: "Oral History Documentation",
    description: "Chief Young Georgewill documents key oral histories, confirming Ke's status as one of two original Kalabari communities.",
    category: "cultural",
    location: "Ke Kingdom"
  },
  {
    year: "August 2020",
    title: "King Agolia Cookey Aboko XIII Crowned",
    description: "HRM King Agolia Cookey Aboko XIII is crowned as the King of Ke Kingdom, leading the community into a new era.",
    category: "political",
    location: "Ke Kingdom"
  },
  {
    year: "2022",
    title: "Zero-Tolerance Declaration",
    description: "The Concerned Youths of Ke (CYK) publicly declare zero tolerance for illegal bunkering, citing proactive reporting to authorities.",
    category: "modern",
    location: "Ke Kingdom"
  },
  {
    year: "November 2024",
    title: "NNPC OML-18 Bukuma Well Fire",
    description: "A wellhead fire caused by illegal bunkering devastates communities in Degema LGA; the Kalabari Regent declares the area a disaster zone.",
    category: "conflict",
    location: "Degema LGA"
  },
  {
    year: "2025",
    title: "Kalabari Renaissance",
    description: "The Kalabari Renaissance Foundation launches unified celebrations with the theme 'Celebrating Our Heritage, Honouring Our Waters And Renewing Our Spirit.'",
    category: "modern",
    location: "Kalabari"
  },
];

const categoryColors = {
  settlement: "bg-ke-gold text-ke-gold",
  political: "bg-secondary text-secondary-foreground",
  cultural: "bg-ke-water text-ke-water",
  conflict: "bg-destructive text-destructive-foreground",
  colonial: "bg-muted text-muted-foreground",
  modern: "bg-accent text-accent-foreground",
};

const categoryIcons = {
  settlement: MapPin,
  political: Crown,
  cultural: Users,
  conflict: Heart,
  colonial: Anchor,
  modern: Calendar,
};

export default function Timeline() {
  const [selectedIndex, setSelectedIndex] = useState(Math.floor(timelineEvents.length / 2));
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (selectedIndex < timelineEvents.length - 1) {
      setDirection(1);
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setDirection(-1);
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const selectedEvent = timelineEvents[selectedIndex];
  const CategoryIcon = categoryIcons[selectedEvent.category];

  return (
    <Layout>
      <SEO page="/timeline" />
      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="tag-ke bg-secondary/20 text-secondary border border-secondary/30 mb-4 inline-block">History & Heritage</span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
              Historical <span className="text-gradient-gold">Timeline</span>
            </h1>
            <p className="text-primary-foreground/70 font-body text-lg max-w-2xl mx-auto">
              Explore the journey of Ke Kingdom from 800 AD to present day — over 1,200 years of history, culture, and resilience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Timeline */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading 
            title="Journey Through Time" 
            subtitle="Navigate the key moments that shaped our kingdom" 
          />

          {/* Timeline Navigation */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <button
              onClick={handlePrev}
              disabled={selectedIndex === 0}
              className="p-3 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1">
                {timelineEvents.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirection(i > selectedIndex ? 1 : -1);
                      setSelectedIndex(i);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === selectedIndex
                        ? "bg-secondary w-8"
                        : i > selectedIndex - 3 && i < selectedIndex + 3
                        ? "bg-secondary/30"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleNext}
              disabled={selectedIndex === timelineEvents.length - 1}
              className="p-3 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Current Event Display */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0, x: direction * 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -100 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-2xl border border-border p-8 shadow-[var(--shadow-elevated)]"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Year Badge */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-2xl bg-secondary flex flex-col items-center justify-center text-secondary-foreground">
                      <span className="text-xs font-ui uppercase tracking-wider opacity-70">Year</span>
                      <span className="font-display text-3xl font-bold">{selectedEvent.year}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-ui font-medium flex items-center gap-1.5 ${categoryColors[selectedEvent.category]}`}>
                        <CategoryIcon size={14} />
                        {selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1)}
                      </span>
                      {selectedEvent.location && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin size={14} />
                          {selectedEvent.location}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-2xl font-bold text-foreground mb-4">
                      {selectedEvent.title}
                    </h3>

                    <p className="text-muted-foreground font-body leading-relaxed">
                      {selectedEvent.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress Indicator */}
          <div className="mt-8 text-center">
            <span className="text-sm font-ui text-muted-foreground">
              Event {selectedIndex + 1} of {timelineEvents.length}
            </span>
          </div>
        </div>
      </section>

      {/* Era Summary Cards */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading 
            title="Historical Eras" 
            subtitle="The major periods that shaped our kingdom" 
          />
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]"
            >
              <div className="w-12 h-12 rounded-lg bg-ke-gold/10 flex items-center justify-center mb-4">
                <Anchor className="text-secondary" size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Ancient Period (800-1600)</h3>
              <p className="text-muted-foreground font-body text-sm">
                Establishment of Ke as one of two original Kalabari communities, development of the war canoe house system, and the birth of the Ekine masquerade tradition.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <Crown className="text-secondary" size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Colonial Period (1600-1960)</h3>
              <p className="text-muted-foreground font-body text-sm">
                Maritime trade with European powers, colonial administration, and the preservation of cultural traditions despite foreign influence.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-xl border border-border p-6 shadow-[var(--shadow-card)]"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Calendar className="text-accent" size={24} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Modern Era (1960-Present)</h3>
              <p className="text-muted-foreground font-body text-sm">
                Post-independence development, civil war challenges, environmental advocacy, and the preservation of heritage through digital platforms.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary">
        <div className="container-narrow px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-display font-bold text-secondary">1200+</div>
              <div className="text-sm font-ui text-primary-foreground/60 mt-1">Years of History</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-secondary">2</div>
              <div className="text-sm font-ui text-primary-foreground/60 mt-1">Original Communities</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-secondary">6</div>
              <div className="text-sm font-ui text-primary-foreground/60 mt-1">Historical Eras</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-secondary">25+</div>
              <div className="text-sm font-ui text-primary-foreground/60 mt-1">Major Events Documented</div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}