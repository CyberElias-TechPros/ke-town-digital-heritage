import { Helmet } from "react-helmet-async";

const DEFAULT = {
  title: "KE Kingdom Digital Heritage",
  desc: "Preserving Kalabari culture and connecting the Ke Kingdom community worldwide. Explore 1200+ years of history, traditions, and heritage.",
  keywords: "Kalabari, Ke Kingdom, Niger Delta, Heritage, Culture, Nigeria, Traditional, Masquerade, History, Diaspora",
  image: "/src/assets/techpros.png",
  url: "https://ke.freegameplay.site",
};

const PAGE_DATA: Record<string, { title: string; desc: string; keywords: string }> = {
  "/": {
    title: "KE Kingdom Digital Heritage - Preserving Kalabari Culture",
    desc: "Discover 1200+ years of Kalabari heritage. Explore Ke Kingdom history, culture, traditions, elder stories, gallery, and connect with the global diaspora community.",
    keywords: "Kalabari, Ke Kingdom, Niger Delta, Heritage, Culture, Nigeria, Diaspora, Traditions, History",
  },
  "/history": {
    title: "History & Origins - KE Kingdom",
    desc: "Explore the history of Ke Kingdom, one of the two ancient foundations of the Kalabari nation, dating back to 800 AD.",
    keywords: "Kalabari history, Ke Kingdom origins, Niger Delta history, 800 AD settlement, Kalabari origins",
  },
  "/timeline": {
    title: "Historical Timeline - KE Kingdom",
    desc: "Interactive timeline of Ke Kingdom from 800 AD to present day. Explore key events, kings, festivals, and cultural milestones.",
    keywords: "Kalabari timeline, Ke Kingdom history timeline, Niger Delta events, historical timeline, Kalabari chronology",
  },
  "/culture": {
    title: "Culture & Traditions - KE Kingdom",
    desc: "Learn about Kalabari culture - masquerades, festivals, attire, cuisine, marriage customs, language, and spirituality.",
    keywords: "Kalabari culture, masquerade, Ekine, festivals, Kalabari attire, George fabric, Onunu, traditional cuisine",
  },
  "/elder-stories": {
    title: "Elder Stories Archive - KE Kingdom",
    desc: "Listen to oral histories and wisdom from Kalabari elders. Preserved stories of traditions, customs, and cultural knowledge.",
    keywords: "oral history, Kalabari elders, traditional stories, oral traditions, cultural preservation",
  },
  "/gallery": {
    title: "Gallery - KE Kingdom",
    desc: "Browse images of Kalabari heritage - masquerades, festivals, landmarks, and cultural artifacts from the community.",
    keywords: "Kalabari gallery, heritage images, masquerade photos, festival pictures, cultural photos",
  },
  "/marketplace": {
    title: "Artisan Marketplace - KE Kingdom",
    desc: "Support local artisans. Buy authentic Kalabari crafts, George fabric, coral jewelry, masquerade art, and traditional items.",
    keywords: "Kalabari marketplace, traditional crafts, George fabric, coral beads, Nigerian artisan, handmade",
  },
  "/virtual-tours": {
    title: "Virtual Tours - KE Kingdom",
    desc: "Explore Ke Kingdom landmarks virtually. Visit King's Palace, Ekine Ground, waterfront, and sacred sites.",
    keywords: "virtual tour, Ke Kingdom visit, Kalabari landmarks, digital tour, Nigerian heritage sites",
  },
  "/visit": {
    title: "Plan Your Visit - KE Kingdom",
    desc: "Planning guide to visit Ke Kingdom in Degema LGA, Rivers State, Nigeria. Travel tips, transport, and local guidance.",
    keywords: "visit Ke Kingdom, travel to Kalabari, Degema LGA, Rivers State tourism, Nigeria travel guide",
  },
  "/diaspora": {
    title: "Diaspora Connect - KE Kingdom",
    desc: "Connect with Kalabari diaspora worldwide. Join the global community, share stories, and stay connected to your roots.",
    keywords: "Kalabari diaspora, diaspora community, global Kalabari, Nigerian diaspora, community connect",
  },
  "/environment": {
    title: "Environment - KE Kingdom",
    desc: "Learn about environmental challenges and conservation efforts in the Niger Delta. Mangroves, pollution, and sustainability.",
    keywords: "Niger Delta environment, mangroves, pollution, conservation, environmental advocacy, Ekereku",
  },
  "/contact": {
    title: "Contact Us - KE Kingdom",
    desc: "Get in touch with KE Kingdom Digital Heritage. Submit inquiries, feedback, or partnership proposals.",
    keywords: "contact Kalabari, Ke Kingdom contact, feedback, partnership, Nigeria cultural organization",
  },
  "/login": {
    title: "Login - KE Kingdom",
    desc: "Login to KE Kingdom Digital Heritage platform.",
    keywords: "login, Kalabari portal, member login",
  },
  "/register": {
    title: "Register - KE Kingdom",
    desc: "Create an account to join the KE Kingdom digital community.",
    keywords: "register, sign up, join Kalabari community",
  },
  "/posts": {
    title: "Community Posts - KE Kingdom",
    desc: "View and share posts with the KE Kingdom community. Connect with fellow members and share your stories.",
    keywords: "Kalabari posts, community posts, diaspora social, Nigeria community",
  },
  "/activity": {
    title: "Activity Feed - KE Kingdom",
    desc: "See recent activity from the KE Kingdom community. Updates, posts, and interactions.",
    keywords: "activity feed, community updates, Kalabari news",
  },
};

export default function SEO({ page }: { page?: string }) {
  const data = page ? PAGE_DATA[page] : null;
  const title = data?.title || DEFAULT.title;
  const desc = data?.desc || DEFAULT.desc;
  const keywords = data?.keywords || DEFAULT.keywords;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={`${DEFAULT.url}${page || ""}`} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={`${DEFAULT.url}${page || ""}`} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="KE Kingdom Digital Heritage" />

      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:card" content="summary_large_image" />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description: desc,
          url: `${DEFAULT.url}${page || ""}`,
          publisher: {
            "@type": "Organization",
            name: "KE Kingdom Digital Heritage",
          },
        })}
      </script>
    </Helmet>
  );
}