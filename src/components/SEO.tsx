import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

const DEFAULT_SEO = {
  title: "KE Kingdom Digital Heritage",
  description: "Preserving Kalabari culture and connecting the Ke Kingdom community worldwide. Explore 1200+ years of history, traditions, and heritage.",
  keywords: ["Kalabari", "Ke Kingdom", "Niger Delta", "Heritage", "Culture", "Nigeria", "Traditional", "Masquerade", "History", "Diaspora"],
  image: "https://ke.freegameplay.site/src/assets/techpros.png",
  url: "https://ke.freegameplay.site/",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "KE Kingdom Digital Heritage",
  "description": "Preserving Kalabari culture and connecting the Ke Kingdom community worldwide",
  "url": "https://ke.freegameplay.site/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://ke.freegameplay.site/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Cyber Elias Academy",
    "logo": {
      "@type": "ImageObject",
      "url": "https://ke.freegameplay.site/src/assets/techpros.png"
    }
  },
  "sameAs": [
    "https://facebook.com/keKingdom",
    "https://twitter.com/keKingdom",
    "https://instagram.com/keKingdom",
    "https://youtube.com/keKingdom"
  ]
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "KE Kingdom",
  "description": "Digital heritage platform for the Kalabari community",
  "url": "https://ke.freegameplay.site/",
  "logo": "https://ke.freegameplay.site/src/assets/techpros.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@keKingdom.com.ng",
    "contactType": "customer service",
    "areaServed": "NG",
    "availableLanguage": ["English"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Degema",
    "addressRegion": "Rivers",
    "addressCountry": "NG"
  },
  "sameAs": [
    "https://facebook.com/keKingdom",
    "https://twitter.com/keKingdom",
    "https://instagram.com/keKingdom"
  ]
};

export default function SEO({
  title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  image = DEFAULT_SEO.image,
  url = DEFAULT_SEO.url,
  type = "website",
  publishedTime,
  author,
  section,
  tags,
}: SEOProps) {
  const location = useLocation();
  const fullUrl = `${DEFAULT_SEO.url}${location.pathname}`;
  const fullTitle = title ? `${title} | KE Kingdom` : DEFAULT_SEO.title;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      <meta name="author" content="Cyber Elias Academy" />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="KE Kingdom Digital Heritage" />
      <meta property="og:locale" content="en_US" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}
      {section && <meta property="article:section" content={section} />}
      {tags?.map((tag, i) => <meta key={i} property="article:tag" content={tag} />)}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@keKingdom" />
      <meta name="twitter:creator" content="@keKingdom" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO */}
      <meta name="theme-color" content="#c8882a" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="KE Kingdom" />
      <meta name="application-name" content="KE Kingdom" />
      <meta name="msapplication-TileColor" content="#c8882a" />
      <meta name="msapplication-config" content="none" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(location.pathname === "/" ? JSON_LD : ORGANIZATION_SCHEMA)}
      </script>
    </Helmet>
  );
}

export { JSON_LD, ORGANIZATION_SCHEMA, DEFAULT_SEO };