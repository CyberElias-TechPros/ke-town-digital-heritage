import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  BookOpen,
  Camera,
  Users,
  MapPin,
  Loader2,
  Newspaper,
  Waves,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/PageSEO";
import {
  CinematicHero,
  Marquee,
  Reveal,
  RevealGroup,
  RevealItem,
  SpotlightCard,
  ParallaxMedia,
  MagneticButton,
  CountUp,
} from "@/components/cinema";
import heroImg from "@/assets/hero-waterway.jpg";
import cultureImg from "@/assets/culture-masquerade.jpg";
import historyImg from "@/assets/history-canoe.jpg";
import mangroveImg from "@/assets/environment-mangrove.jpg";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ data */

const quickCards = [
  {
    icon: BookOpen,
    title: "History & Origins",
    desc: "Settlement from 800 AD, the canoe houses and the founding of a nation.",
    path: "/history",
    tone: "text-ke-gold",
  },
  {
    icon: Camera,
    title: "Culture & Traditions",
    desc: "Ekine masquerades, festivals, cuisine and the Kalabari language.",
    path: "/culture",
    tone: "text-ke-water",
  },
  {
    icon: MapPin,
    title: "Visit Ke Kingdom",
    desc: "Travel the Niger Delta waterways and plan your journey here.",
    path: "/visit",
    tone: "text-secondary",
  },
  {
    icon: Users,
    title: "Diaspora Connect",
    desc: "Rejoin a community that spans continents and generations.",
    path: "/diaspora",
    tone: "text-accent",
  },
  {
    icon: Waves,
    title: "Environment",
    desc: "Mangrove ecology, clean-up projects and the fight for the creeks.",
    path: "/environment",
    tone: "text-ke-deep",
  },
  {
    icon: BookOpen,
    title: "Marketplace",
    desc: "Commission work directly from Ke's artisans and makers.",
    path: "/marketplace",
    tone: "text-ke-gold",
  },
];

const ticker = [
  "Ekine masquerade",
  "War canoe houses",
  "Kalabari language",
  "Degema LGA",
  "Onunu cuisine",
  "Mangrove creeks",
  "Settled 800 AD",
  "Kemsaipruye-Igbo",
  "Angulama & Ke",
  "Niger Delta",
];

interface NewsItem {
  _id: string;
  title: string;
  excerpt: string;
  category: string;
  createdAt: string;
}

interface EventItem {
  _id: string;
  title?: string;
  name?: string;
  date?: string;
  startDate?: string;
  type: string;
}

/* ------------------------------------------------------------- component */

const Index = () => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Counter-rotating background rule — a quiet sense of motion on scroll.
  const ruleRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 3]);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    api
      .getNews()
      .then((data: any) => {
        if (!live) return;
        const list = Array.isArray(data) ? data : data?.news ?? [];
        setNews(list.slice(0, 3));
      })
      .catch(() => live && setFeedError("Community news is unavailable right now."))
      .finally(() => live && setLoadingNews(false));

    api
      .getEvents()
      .then((data: any) => {
        if (!live) return;
        const list = Array.isArray(data) ? data : data?.events ?? [];
        setEvents(list.slice(0, 3));
      })
      .catch(() => live && setFeedError("The events calendar is unavailable right now."))
      .finally(() => live && setLoadingEvents(false));

    return () => {
      live = false;
    };
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return "Date TBA";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Date TBA";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Layout>
      <SEO page="/" />

      <CinematicHero
        image={heroImg}
        eyebrow="Degema LGA · Rivers State · Nigeria"
        lines={["Welcome to the", "living archive of"]}
        accentLine="Ke Kingdom"
        lede="One of the two original foundations of the Kalabari nation. Twelve centuries of language, masquerade and rivercraft — recorded, remembered and carried forward by the people who live it."
        primary={{ label: "Explore our heritage", to: "/history" }}
        secondary={{ label: "Discover the culture", to: "/culture" }}
        stats={[
          { value: 800, label: "Settled AD", suffix: "" },
          { value: 33, label: "Kalabari towns" },
          { value: 3, label: "LGAs in kingdom" },
          { value: 579, label: "Kalabari people", prefix: "~", suffix: "K" },
        ]}
      />

      {/* Heritage ticker */}
      <div className="relative border-y border-border bg-muted/40 py-4">
        <Marquee duration={48}>
          {ticker.map((item) => (
            <span
              key={item}
              className="ke-eyebrow mx-7 flex shrink-0 items-center gap-7 whitespace-nowrap text-muted-foreground"
            >
              {item}
              <span className="h-1 w-1 rounded-full bg-secondary" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* Proof band */}
      <section className="relative overflow-hidden bg-ke-deep py-20 text-white">
        <motion.div
          aria-hidden
          style={{ rotate: ruleRotate }}
          className="absolute -inset-x-1/4 inset-y-0 opacity-[0.06]"
        >
          <div className="h-full w-full border-x border-white" />
        </motion.div>
        <div className="container-narrow relative px-4 md:px-8">
          <Reveal>
            <p className="ke-eyebrow mb-8 text-secondary">A civilisation, measured</p>
          </Reveal>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {[
              { value: 1200, suffix: "+", label: "Years of documented settlement" },
              { value: 2, label: "Original Kalabari communities" },
              { value: 33, label: "Towns across the nation" },
              { value: 579, prefix: "~", suffix: "K", label: "Kalabari people worldwide" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.09}>
                <div className="border-l border-white/12 pl-5">
                  <p className="ke-display text-4xl text-secondary sm:text-5xl">
                    <CountUp value={s.value} prefix={s.prefix ?? ""} suffix={s.suffix ?? ""} />
                  </p>
                  <p className="ke-pretty mt-3 max-w-[22ch] font-body text-sm leading-relaxed text-white/60">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About — sticky editorial */}
      <section className="section-padding bg-background">
        <div className="container-narrow grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <p className="ke-eyebrow mb-5 text-secondary">About</p>
              <h2 className="ke-display ke-balance text-4xl text-foreground sm:text-5xl">
                One of two ancient foundations of the Kalabari nation
              </h2>
              <div className="ke-rule mt-8 w-full" />
            </Reveal>
            <Reveal delay={0.12} className="mt-8">
              <Reveal mask>
                <p className="font-display text-xl italic leading-snug text-muted-foreground">
                  "Ke gave the Kalabari nation its language and its Ekine masquerade tradition."
                </p>
              </Reveal>
              <p className="mt-4 ke-eyebrow text-muted-foreground/70">
                Chief Young Georgewill · Oral historian · 2015
              </p>
            </Reveal>
            <Reveal delay={0.2} className="mt-10">
              <MagneticButton to="/history" variant="solid">
                Read the full history <ArrowRight size={16} />
              </MagneticButton>
            </Reveal>
          </div>

          <div className="space-y-7">
            <Reveal>
              <p className="ke-pretty font-body text-lg leading-relaxed text-muted-foreground">
                Ke Kingdom is a coastal Kalabari community in Degema Local Government Area of
                Rivers State. Archaeological evidence dates settlement to{" "}
                <strong className="text-foreground">at least 800 AD</strong>, making it one of the
                oldest documented human settlements in the eastern Niger Delta.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="ke-pretty font-body text-lg leading-relaxed text-muted-foreground">
                Ke is one of only <strong className="text-foreground">two original indigenous
                communities</strong> in all of Kalabari territory — the other being Angulama.
                Every other major Kalabari city arrived later as immigrants.
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="ke-pretty font-body text-lg leading-relaxed text-muted-foreground">
                Today the kingdom is led by{" "}
                <strong className="text-foreground">
                  HRM King Agolia Cookey Aboko Omoni XIII
                </strong>{" "}
                (crowned August 2020) and holds the{" "}
                <strong className="text-foreground">Kemsaipruye-Igbo group of houses</strong> — a
                historic war canoe lineage carrying centuries of maritime tradition.
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="group relative mt-2 overflow-hidden rounded-2xl">
                <img
                  src={historyImg}
                  alt="Kalabari war canoe on the creek"
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-72 w-full object-cover transition-transform duration-[1.2s] [transition-timing-function:var(--ease-cinema)] group-hover:scale-[1.06] sm:h-96"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ke-deep/70 via-transparent to-transparent" />
                <p className="absolute bottom-5 left-6 ke-eyebrow text-white/80">
                  The war canoe houses
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Explore — spotlight grid */}
      <section className="section-padding relative overflow-hidden bg-muted/40">
        <div className="container-narrow">
          <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="ke-eyebrow mb-4 text-secondary">Explore</p>
              <h2 className="ke-display ke-balance text-4xl text-foreground sm:text-5xl">
                Six doors into the kingdom
              </h2>
            </div>
            <Link
              to="/feed"
              className="ke-link ke-eyebrow text-muted-foreground hover:text-secondary"
            >
              Enter the community feed
            </Link>
          </Reveal>

          <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickCards.map((card) => (
              <RevealItem key={card.path}>
                <SpotlightCard className="h-full overflow-hidden rounded-2xl border border-border bg-card">
                  <Link to={card.path} className="group block p-7">
                    <div className="mb-6 flex items-start justify-between">
                      <card.icon size={26} className={card.tone} />
                      <ArrowUpRight
                        size={18}
                        className="text-muted-foreground transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-secondary"
                      />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {card.title}
                    </h3>
                    <p className="ke-pretty mt-3 font-body text-sm leading-relaxed text-muted-foreground">
                      {card.desc}
                    </p>
                  </Link>
                </SpotlightCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Culture interstitial */}
      <ParallaxMedia src={cultureImg} alt="Kalabari Ekine masquerade" height="h-[60vh]" speed={0.16}>
        <div className="absolute inset-0 bg-gradient-to-r from-ke-deep/85 via-ke-deep/45 to-transparent" />
        <div className="relative z-10 flex h-full items-center">
          <div className="container-narrow px-4 md:px-8">
            <Reveal>
              <p className="ke-eyebrow mb-5 text-secondary">Living culture</p>
              <h2 className="ke-display ke-balance max-w-2xl text-3xl text-white sm:text-5xl">
                The masquerade does not perform. It testifies.
              </h2>
              <p className="ke-pretty mt-6 max-w-lg font-body text-base leading-relaxed text-white/70">
                Ekine is Ke's most sacred institution — a secular masquerade society whose dances
                encode history, law and lineage in movement.
              </p>
              <div className="mt-9">
                <MagneticButton to="/culture" variant="solid">
                  Explore culture & traditions <ArrowRight size={16} />
                </MagneticButton>
              </div>
            </Reveal>
          </div>
        </div>
      </ParallaxMedia>

      {/* News & events — live from the Worker */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          {feedError && (
            <p className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {feedError}
            </p>
          )}

          <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
            <div>
              <Reveal className="mb-9 flex items-center gap-3">
                <Newspaper size={20} className="text-secondary" />
                <h3 className="font-display text-2xl font-bold text-foreground">Community news</h3>
              </Reveal>

              <div className="space-y-4">
                {loadingNews ? (
                  <div className="flex items-center gap-3 py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                    <span className="text-sm">Loading news…</span>
                  </div>
                ) : news.length > 0 ? (
                  news.map((item, i) => (
                    <Reveal key={item._id} delay={i * 0.08}>
                      <SpotlightCard className="overflow-hidden rounded-2xl border border-border bg-card">
                        <Link to="/feed" className="group block p-6">
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <span className="tag-ke bg-secondary/10 text-secondary">
                              {item.category || "Community"}
                            </span>
                            <span className="ke-eyebrow text-muted-foreground/70">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <h4 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-secondary">
                            {item.title}
                          </h4>
                          <p className="ke-pretty mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                            {item.excerpt}
                          </p>
                        </Link>
                      </SpotlightCard>
                    </Reveal>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="font-display text-foreground">No news published yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Editors can publish from the admin console.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Reveal className="mb-9 flex items-center gap-3">
                <Calendar size={20} className="text-accent" />
                <h3 className="font-display text-2xl font-bold text-foreground">Upcoming events</h3>
              </Reveal>

              <div className="space-y-4">
                {loadingEvents ? (
                  <div className="flex items-center gap-3 py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-sm">Loading events…</span>
                  </div>
                ) : events.length > 0 ? (
                  events.map((event, i) => (
                    <Reveal key={event._id} delay={i * 0.08}>
                      <SpotlightCard className="overflow-hidden rounded-2xl border border-border bg-card">
                        <Link to={`/events/${event._id}`} className="group flex items-center gap-5 p-6">
                          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10">
                            <span className="font-display text-lg font-bold text-accent">
                              {new Date(event.startDate ?? event.date ?? Date.now()).getDate()}
                            </span>
                            <span className="ke-eyebrow text-accent/70">
                              {new Date(event.startDate ?? event.date ?? Date.now()).toLocaleString(
                                "en-GB",
                                { month: "short" },
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-display text-base font-semibold text-foreground transition-colors group-hover:text-secondary">
                              {event.title ?? event.name ?? "Community event"}
                            </h4>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <span className="tag-ke bg-accent/10 text-accent">
                                {event.type || "Community"}
                              </span>
                              <span className="ke-eyebrow text-muted-foreground/70">
                                {formatDate(event.startDate ?? event.date)}
                              </span>
                            </div>
                          </div>
                          <ArrowUpRight
                            size={18}
                            className="shrink-0 text-muted-foreground transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-secondary"
                          />
                        </Link>
                      </SpotlightCard>
                    </Reveal>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="font-display text-foreground">Nothing on the calendar</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Check back soon — festivals are announced each season.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Environment strip */}
      <ParallaxMedia src={mangroveImg} alt="Mangrove creek in the Niger Delta" height="h-[45vh]" speed={0.12} kenBurns={false}>
        <div className="absolute inset-0 bg-ke-deep/55" />
        <Reveal className="relative z-10 flex h-full items-center">
          <div className="container-narrow flex flex-wrap items-end justify-between gap-8 px-4 md:px-8">
            <div>
              <p className="ke-eyebrow mb-4 text-secondary">Stewardship</p>
              <h2 className="ke-display ke-balance max-w-xl text-3xl text-white sm:text-4xl">
                The creeks raised us. We are raising them back.
              </h2>
            </div>
            <MagneticButton to="/environment" variant="outline" className="text-white">
              See our projects <ArrowRight size={16} />
            </MagneticButton>
          </div>
        </Reveal>
      </ParallaxMedia>

      {/* CTA */}
      <section className="ke-aurora relative overflow-hidden bg-ke-deep py-28 text-white">
        <div className="container-narrow relative z-10 px-4 text-center md:px-8">
          <Reveal>
            <p className="ke-eyebrow mb-6 text-secondary">Join us</p>
            <h2 className="ke-display ke-balance mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
              There is a place for you in this story
            </h2>
            <p className="ke-pretty mx-auto mt-7 max-w-xl font-body text-lg leading-relaxed text-white/70">
              Whether you trace your lineage to Ke, live in the diaspora, or simply want to learn —
              the archive is open and the community is waiting.
            </p>
            <div className="mt-11 flex flex-wrap justify-center gap-4">
              <MagneticButton to="/register" variant="solid">
                Create your account <ArrowRight size={16} />
              </MagneticButton>
              <MagneticButton to="/diaspora" variant="outline" className="text-white">
                Connect with the diaspora
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
