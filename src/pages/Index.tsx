import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, BookOpen, Camera, Users, MapPin, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import AnimatedCard from "@/components/AnimatedCard";
import heroImg from "@/assets/hero-waterway.jpg";
import cultureImg from "@/assets/culture-masquerade.jpg";
import historyImg from "@/assets/history-canoe.jpg";

const quickCards = [
  { icon: BookOpen, title: "History & Origins", desc: "Discover the ancient roots of the Kalabari Kingdom", path: "/history", color: "bg-ke-gold/10 text-ke-gold" },
  { icon: Camera, title: "Culture & Traditions", desc: "Masquerades, festivals, cuisine, and language", path: "/culture", color: "bg-ke-water/10 text-ke-water" },
  { icon: MapPin, title: "Visit Ke Town", desc: "Travel guide to the Niger Delta waterways", path: "/visit", color: "bg-ke-deep/10 text-ke-deep" },
  { icon: Users, title: "Diaspora Connect", desc: "Join the global Ke Town community", path: "/diaspora", color: "bg-secondary/10 text-secondary" },
];

const stats = [
  { num: "33", label: "Kalabari Towns" },
  { num: "3", label: "LGAs in Kingdom" },
  { num: "138K+", label: "Degema Population" },
  { num: "1,011", label: "km² LGA Area" },
];

const upcomingEvents = [
  { name: "Owu-Aru-Sun Festival", date: "Coming Soon", type: "Festival" },
  { name: "Kalabari New Year", date: "Annual", type: "Cultural" },
  { name: "Ekine Masquerade Season", date: "Seasonal", type: "Tradition" },
];

const announcements = [
  { title: "Community Development Meeting", date: "Upcoming", excerpt: "All sons and daughters of Ke Town are invited to discuss ongoing development projects." },
  { title: "Cultural Heritage Documentation", date: "Ongoing", excerpt: "Help us preserve Kalabari heritage by sharing stories, photos, and recordings." },
  { title: "Youth Mentorship Program Launch", date: "New", excerpt: "Connecting the next generation with elders and experienced professionals." },
];

const Index = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <Layout>
      {/* Hero Section */}
      <section ref={heroRef} className="relative h-screen min-h-[600px] overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <img src={heroImg} alt="Ke Town waterways" width={1920} height={1080} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(160 37% 16% / 0.4) 0%, hsl(160 37% 16% / 0.8) 70%, hsl(160 37% 16%) 100%)" }} />
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-ui font-medium mb-6 border border-secondary/30">
              Degema LGA, Rivers State, Nigeria
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground mb-4 leading-[0.95]"
          >
            Welcome to<br />
            <span className="text-gradient-gold">KE Town</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="font-display text-xl md:text-2xl text-secondary italic mb-2"
          >
            "Kengemina Kalabari — A ro sin te oo!"
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-primary-foreground/70 font-body text-base md:text-lg max-w-xl mb-8"
          >
            A proud Kalabari community in the heart of the Niger Delta. Preserving heritage, connecting generations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]"
            >
              Explore Our Heritage <ArrowRight size={16} />
            </Link>
            <Link
              to="/culture"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 rounded-lg font-ui font-semibold text-sm hover:bg-primary-foreground/20 transition-all"
            >
              Discover Culture
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-6 h-10 border-2 border-primary-foreground/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-secondary rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-primary py-6">
        <div className="container-narrow px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-display font-bold text-secondary">{stat.num}</div>
              <div className="text-xs font-ui text-primary-foreground/60 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <SectionHeading
            title="About Ke Town"
            subtitle="A coastal Kalabari community with centuries of history"
          />
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-muted-foreground font-body leading-relaxed mb-6">
                Ke Town is a coastal Kalabari community situated in Degema Local Government Area of Rivers State, Nigeria. It sits among the mangrove swamps and waterways of the Niger Delta, and is one of 33 Kalabari towns that form the Kalabari Kingdom — an independent traditional state of the Ijaw ethnic group.
              </p>
              <p className="text-muted-foreground font-body leading-relaxed mb-6">
                Ke Town holds the <strong className="text-foreground">Kemsaipruye-Igbo group of houses</strong>, one of the historic war canoe house lineages of the Kalabari people, embodying centuries of maritime tradition and warrior heritage.
              </p>
              <Link to="/history" className="inline-flex items-center gap-2 text-secondary font-ui font-semibold text-sm hover:gap-3 transition-all">
                Read Full History <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-xl overflow-hidden shadow-[var(--shadow-elevated)]"
            >
              <img src={historyImg} alt="Kalabari war canoe" loading="lazy" width={1024} height={1024} className="w-full h-80 object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Cards */}
      <section className="section-padding bg-muted/50">
        <div className="container-narrow">
          <SectionHeading title="Explore KE Town" subtitle="Discover the many facets of our community" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickCards.map((card, i) => (
              <AnimatedCard key={card.path} delay={i * 0.1}>
                <Link to={card.path} className="block p-6 group">
                  <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <card.icon size={24} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground font-body mb-3">{card.desc}</p>
                  <span className="text-sm text-secondary font-ui font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn more <ArrowRight size={14} />
                  </span>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* News & Events */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Announcements */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-ke-gold/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-secondary" />
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">Community News</h3>
              </div>
              <div className="space-y-4">
                {announcements.map((item, i) => (
                  <AnimatedCard key={i} delay={i * 0.1}>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="tag-ke bg-secondary/10 text-secondary">{item.date}</span>
                      </div>
                      <h4 className="font-display text-lg font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground font-body">{item.excerpt}</p>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </div>

            {/* Events */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-ke-water/10 flex items-center justify-center">
                  <Calendar size={20} className="text-accent" />
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">Upcoming Events</h3>
              </div>
              <div className="space-y-4">
                {upcomingEvents.map((event, i) => (
                  <AnimatedCard key={i} delay={i * 0.1}>
                    <div className="p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-accent/10 flex flex-col items-center justify-center flex-shrink-0">
                        <Clock size={18} className="text-accent" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display text-base font-semibold text-foreground">{event.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="tag-ke bg-accent/10 text-accent">{event.type}</span>
                          <span className="text-xs text-muted-foreground font-ui">{event.date}</span>
                        </div>
                      </div>
                    </div>
                  </AnimatedCard>
                ))}
              </div>

              {/* Culture preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-8 rounded-xl overflow-hidden relative group"
              >
                <img src={cultureImg} alt="Kalabari masquerade" loading="lazy" width={1024} height={1024} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                  <Link to="/culture" className="text-primary-foreground font-display text-lg font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                    Explore Culture & Traditions <ArrowRight size={18} />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 container-narrow px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Join the KE Town Community
            </h2>
            <p className="text-primary-foreground/70 font-body text-lg max-w-xl mx-auto mb-8">
              Whether you're from Ke Town or simply curious about Kalabari culture, there's a place for you here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/diaspora"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-ui font-semibold text-sm hover:bg-secondary/90 transition-all shadow-[var(--shadow-gold)]"
              >
                Connect with Diaspora <ArrowRight size={16} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 rounded-lg font-ui font-semibold text-sm hover:bg-primary-foreground/20 transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
