import * as React from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Home, MapPin, Moon, Sparkles, Sun, UserRound, Library, LogIn, ClipboardList, BarChart3 } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useMe } from "@/hooks/use-me";
import { useTheme } from "@/hooks/use-theme";
import { useBag } from "@/hooks/use-bag";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@shared/contact";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match?: (p: string) => boolean };

function useNav(signedIn: boolean, me: ReturnType<typeof useMe>["me"]): NavItem[] {
  // Stringers get their queue where "Home" was; brands get their portal. Both keep their player tabs.
  if (signedIn && me.shop) {
    return [
      { href: "/shop", label: "Queue", icon: ClipboardList, match: (p) => p.startsWith("/shop") && !p.startsWith("/shops") },
      { href: "/bag", label: "My bag", icon: Briefcase, match: (p) => p.startsWith("/bag") },
      { href: "/setup", label: "Setup", icon: Sparkles, match: (p) => p.startsWith("/setup") || p.startsWith("/recommendation") },
      { href: "/shops", label: "Stringers", icon: MapPin, match: (p) => p.startsWith("/stringers") || p.startsWith("/shops") || p.startsWith("/bookings") },
      { href: "/account", label: "Account", icon: UserRound, match: (p) => p.startsWith("/account") || p.startsWith("/pricing") },
    ];
  }
  if (signedIn && me.brand) {
    return [
      { href: "/brand", label: "Brand", icon: BarChart3, match: (p) => p.startsWith("/brand") && !p.startsWith("/brands") },
      { href: "/bag", label: "My bag", icon: Briefcase, match: (p) => p.startsWith("/bag") },
      { href: "/setup", label: "Setup", icon: Sparkles, match: (p) => p.startsWith("/setup") || p.startsWith("/recommendation") },
      { href: "/shops", label: "Stringers", icon: MapPin, match: (p) => p.startsWith("/stringers") || p.startsWith("/shops") || p.startsWith("/bookings") },
      { href: "/account", label: "Account", icon: UserRound, match: (p) => p.startsWith("/account") || p.startsWith("/pricing") },
    ];
  }
  return signedIn
    ? [
        { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { href: "/bag", label: "My bag", icon: Briefcase, match: (p) => p.startsWith("/bag") },
        { href: "/setup", label: "Setup", icon: Sparkles, match: (p) => p.startsWith("/setup") || p.startsWith("/onboarding") || p.startsWith("/recommendation") },
        { href: "/shops", label: "Stringers", icon: MapPin, match: (p) => p.startsWith("/stringers") || p.startsWith("/shops") || p.startsWith("/bookings") },
        { href: "/account", label: "Account", icon: UserRound, match: (p) => p.startsWith("/account") || p.startsWith("/pricing") },
      ]
    : [
        { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
        { href: "/setup", label: "Setup", icon: Sparkles, match: (p) => p.startsWith("/setup") || p.startsWith("/onboarding") || p.startsWith("/recommendation") },
        { href: "/shops", label: "Stringers", icon: MapPin, match: (p) => p.startsWith("/stringers") || p.startsWith("/shops") },
        { href: "/rackets", label: "Rackets", icon: Library, match: (p) => p.startsWith("/rackets") },
        { href: "/login", label: "Log in", icon: LogIn, match: (p) => p === "/login" || p === "/signup" },
      ];
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

function DueDot() {
  const { signedIn } = useMe();
  const bag = useBag(signedIn);
  const due = bag.data?.rackets.filter((r) => r.reminder.status === "overdue" || r.reminder.status === "due-soon").length ?? 0;
  if (!due) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-brand px-1 text-[0.625rem] font-bold leading-[1.1rem] text-brand-ink">
      {due}
    </span>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signedIn, me, loading } = useMe();
  const nav = useNav(signedIn, me);

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  const desktopLinks = signedIn
    ? [...nav.filter((n) => n.href !== "/account"), { href: "/rackets", label: "Rackets", icon: Library, match: (p: string) => p.startsWith("/rackets") }]
    : [
        { href: "/setup", label: "Get a setup", icon: Sparkles, match: (p: string) => p.startsWith("/setup") },
        { href: "/shops", label: "Stringers", icon: MapPin, match: (p: string) => p.startsWith("/stringers") || p.startsWith("/shops") },
        { href: "/rackets", label: "Rackets", icon: Library, match: (p: string) => p.startsWith("/rackets") },
        { href: "/business", label: "For business", icon: Library, match: (p: string) => p.startsWith("/business") },
        { href: "/pricing", label: "Pricing", icon: Library, match: (p: string) => p.startsWith("/pricing") },
      ];

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="10IS home" className="rounded-lg">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {desktopLinks.map((n) => {
              const active = n.match ? n.match(location) : location === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-surface shadow-card ring-1 ring-line" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                  )}
                  <span className="relative">
                    {n.label}
                    {n.href === "/bag" && <DueDot />}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {loading ? (
              <div className="h-9 w-20" />
            ) : signedIn ? (
              <Link
                href="/account"
                className="grid size-9 place-items-center rounded-full bg-ink text-sm font-semibold text-bg transition-transform active:scale-95"
                aria-label="Account"
              >
                {(me.firstName?.[0] ?? me.email?.[0] ?? "?").toUpperCase()}
              </Link>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild variant="ink" size="sm">
                  <Link href="/signup">Join free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={location.split("/")[1] || "home"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <Footer />

      {/* Thumb-reachable tab bar on phones */}
      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/85 backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
          {nav.map((n) => {
            const active = n.match ? n.match(location) : location === n.href;
            const Icon = n.icon;
            const center = n.href === "/setup";
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "relative grid place-items-center rounded-full transition-all duration-300 ease-spring",
                      center ? "-mt-5 size-12 bg-brand text-brand-ink shadow-[0_10px_24px_-10px_rgb(var(--brand))]" : "size-7",
                      active && !center && "bg-surface-2",
                    )}
                  >
                    <Icon className={center ? "size-5" : "size-[1.15rem]"} />
                    {n.href === "/bag" && <DueDot />}
                  </span>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 hidden border-t border-line md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-10 text-sm text-muted">
        <div className="flex items-center gap-3">
          <Logo className="scale-90" />
          <span>by Hevini Sporting</span>
        </div>
        <nav className="flex flex-wrap gap-6" aria-label="Footer">
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
          <Link href="/business" className="hover:text-ink">For business</Link>
          <Link href="/how-we-rank" className="hover:text-ink">How we rank</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

/** Standard page container. */
export function Page({ children, className, narrow }: { children: React.ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 pt-6 sm:px-6 sm:pt-10", narrow ? "max-w-2xl" : "max-w-6xl", className)}>{children}</div>;
}
