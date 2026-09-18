/**
 * Frontend integration smoke tests.
 *
 * These render the real page components in jsdom with the real `ApiClient`,
 * talking to the Cloudflare Worker under test (see src/test/setup.ts for the
 * relative-URL rewrite). They catch the class of bug a typecheck cannot:
 * a page that throws during render, a component that reads a field the API
 * never returns, or a hook that fires an unhandled promise.
 *
 * Run with the Worker up:  WORKER_BASE=http://127.0.0.1:8787 npm test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

import Index from "@/pages/Index";
import History from "@/pages/History";
import Culture from "@/pages/Culture";
import Gallery from "@/pages/Gallery";
import Visit from "@/pages/Visit";
import Diaspora from "@/pages/Diaspora";
import Environment from "@/pages/Environment";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/NotFound";
import Marketplace from "@/pages/Marketplace";
import Timeline from "@/pages/Timeline";
import ElderStories from "@/pages/ElderStories";
import VirtualTours from "@/pages/VirtualTours";
import DigitalSkills from "@/pages/DigitalSkills";
import Profile from "@/pages/Profile";

const WORKER = process.env.WORKER_BASE || "http://127.0.0.1:8787";

function renderPage(path: string, element: React.ReactNode, route = path) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path={route} element={element} />
                <Route path="*" element={<div data-testid="fallback-route" />} />
              </Routes>
            </MemoryRouter>
          </TooltipProvider>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

describe("Worker reachability", () => {
  it("the Worker under test answers /api/health", async () => {
    const res = await fetch(`${WORKER}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.platform).toBe("cloudflare-workers");
  });
});

describe("public pages render against the live API", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const pages: [string, React.ReactNode, string][] = [
    ["/", <Index key="i" />, "KE Kingdom"],
    ["/history", <History key="h" />, "History"],
    ["/culture", <Culture key="c" />, "Culture"],
    ["/gallery", <Gallery key="g" />, "Gallery"],
    ["/visit", <Visit key="v" />, "Visit"],
    ["/diaspora", <Diaspora key="d" />, "Diaspora"],
    ["/environment", <Environment key="e" />, "Environment"],
    ["/contact", <Contact key="ct" />, "Contact"],
    ["/login", <Login key="l" />, "Sign"],
    ["/register", <Register key="r" />, "Create"],
    ["/forgot-password", <ForgotPassword key="f" />, "password"],
    ["/marketplace", <Marketplace key="m" />, "Marketplace"],
    ["/timeline", <Timeline key="t" />, "Timeline"],
    ["/elder-stories", <ElderStories key="es" />, "Elder"],
    ["/virtual-tours", <VirtualTours key="vt" />, "Tour"],
    ["/digital-skills", <DigitalSkills key="ds" />, "Skill"],
    ["/definitely-not-a-page", <NotFound key="nf" />, "404"],
  ];

  for (const [path, element, probe] of pages) {
    it(`${path} mounts without throwing`, async () => {
      const errors: Error[] = [];
      const spy = vi.spyOn(console, "error").mockImplementation((msg: any) => {
        if (msg instanceof Error) errors.push(msg);
        else if (typeof msg === "string" && /unhandled|Cannot read|is not a function/.test(msg)) {
          errors.push(new Error(msg));
        }
      });

      renderPage(path, element);

      // Give effects + API calls a chance to settle.
      await waitFor(() => {
        expect(document.body.textContent?.length ?? 0).toBeGreaterThan(0);
      });
      await new Promise((r) => setTimeout(r, 150));

      const hardErrors = errors.filter(
        (e) => !/not wrapped in act|React Router Future Flag|update on an unmounted/i.test(e.message),
      );
      expect(hardErrors.map((e) => e.message)).toEqual([]);

      // The page should have produced recognisable content, not a blank shell.
      expect(document.body.textContent).toMatch(new RegExp(probe, "i"));

      spy.mockRestore();
    });
  }
});

describe("homepage composition", () => {
  beforeEach(() => localStorage.clear());

  it("renders the cinematic hero and pulls live news/events", async () => {
    renderPage("/", <Index />);

    await waitFor(() => {
      expect(screen.getByText(/Explore our heritage/i)).toBeInTheDocument();
    });

    // Hero copy is composed from the design system, not a placeholder.
    // The headline is revealed word-by-word, so assert on individual words.
    for (const word of ["Welcome", "living", "archive"]) {
      expect(screen.getByText(new RegExp(`^${word}$`, "i"))).toBeInTheDocument();
    }
    // "Ke Kingdom" is the accent line and also appears in the header/nav.
    expect(screen.getAllByText(/^Ke Kingdom$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Discover the culture/i)).toBeInTheDocument();
    expect(screen.getByText(/Twelve centuries of language/i)).toBeInTheDocument();

    // The stats band animates from zero, so assert the label rather than value.
    await waitFor(() => {
      expect(screen.getAllByText(/Years of documented settlement/i).length).toBeGreaterThan(0);
    });
  });
});

describe("authenticated journey against the live API", () => {
  it("logs in, then renders profile, marketplace and messages", async () => {
    const { api } = await import("@/lib/api");

    const session = await api.login("tari@ketown.com.ng", "KEtown@2026");
    expect(session.token).toBeTruthy();
    expect(session.user.email).toBe("tari@ketown.com.ng");

    // Seed the auth cache exactly the way AuthContext would on a real login.
    localStorage.setItem("keKingdom_token", session.token);
    localStorage.setItem(
      "keKingdom_user",
      JSON.stringify({ ...session.user, id: session.user.id ?? (session.user as any)._id }),
    );

    // Profile
    renderPage("/profile", <Profile key="p" />);
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Tari/i);
      },
      { timeout: 8000 },
    );

    // Marketplace pulls the seeded catalogue
    const products = await api.getProducts();
    const list = Array.isArray(products) ? products : (products as any)?.products ?? [];
    expect(list.length).toBeGreaterThan(0);

    // Cart round-trip — as a *buyer*, since the Worker correctly refuses to let
    // a seller add their own listing to their own cart.
    const buyer = await api.login("boma@ketown.com.ng", "KEtown@2026");
    const buyerId = buyer.user.id ?? (buyer.user as any)._id;
    const buyable = list.find(
      (p: any) =>
        String(p.seller?._id ?? p.sellerId ?? "") !== String(buyerId) &&
        Number(p.stock ?? p.quantity ?? 0) > 0,
    );
    expect(buyable, "expected at least one in-stock listing from another seller").toBeTruthy();
    const firstId = (buyable as any)._id ?? (buyable as any).id;
    const cart = await api.addToCart(buyer.token, firstId, 2);
    expect(cart.cart.length).toBeGreaterThan(0);
    const summary = await api.getCartSummary(buyer.token);
    expect(summary.subtotal).toBeGreaterThan(0);
    await api.clearCart(buyer.token);
    const empty = await api.getCartSummary(buyer.token);
    expect(empty.subtotal).toBe(0);

    // Notifications endpoint answers for an authenticated seller
    const notes = await api.getNotifications(session.token);
    expect(Array.isArray(notes)).toBe(true);
  });
});
