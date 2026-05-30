import { Link, useLocation } from "wouter";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatBot } from "@/components/ChatBot";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useUser } from "@/contexts/UserContext";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isPro, isAdmin, loading, email, firstName, refetch } = useUser();
  const showUpgrade = !loading && !isPro && !isAdmin;
  const isLoggedIn = !loading && !!email;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    refetch();
  }

  const navItems = [
    { label: "RACKETS", path: "/rackets" },
    { label: "STRINGERS", path: "/stringers" },
    { label: "SETUP", path: "/onboarding" },
    { label: "PRICING", path: "/pricing" },
    { label: "ABOUT", path: "/about" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-court-black font-body text-foreground">
      <header className="sticky top-0 z-50 w-full bg-court-black border-b border-[#1A1A1A]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={signatureLogo}
              alt="10IS — Powered by Hevini Sporting"
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="leading-tight hidden sm:block">
              <div
                className="text-court-white font-display font-black text-xl"
                style={{ letterSpacing: "0.12em" }}
              >
                10IS
              </div>
              <div
                className="text-net-grey text-[10px] font-normal"
                style={{ letterSpacing: "0.05em" }}
              >
                Powered by Hevini Sporting
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {/* Primary nav links */}
            {navItems.map((item) => {
              const active = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`text-xs font-bold transition-colors ${
                    active ? "text-court-white" : "text-net-grey hover:text-court-white"
                  }`}
                  style={{ letterSpacing: "0.08em" }}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Separator */}
            <div className="w-px h-4 bg-[#2A2A2A] shrink-0" />

            {/* Account section */}
            {showUpgrade && (
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-4 rounded-[2px] text-xs font-bold uppercase border-hevini-red text-hevini-red hover:bg-hevini-red hover:text-white transition-colors"
                  style={{ letterSpacing: "0.1em" }}
                >
                  <Zap className="w-3 h-3 mr-1.5" />
                  UPGRADE
                </Button>
              </Link>
            )}
            {!loading && (isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-net-grey max-w-[120px] truncate">{firstName ?? email}</span>
                <Link href="/account">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-court-white hover:text-court-white transition-colors"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    ACCOUNT
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="h-9 px-4 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-court-white hover:text-court-white transition-colors"
                  style={{ letterSpacing: "0.1em" }}
                >
                  LOGOUT
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 rounded-[2px] text-xs font-bold uppercase border-[#333] text-net-grey hover:border-court-white hover:text-court-white transition-colors"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    LOGIN
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="h-9 px-5 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] text-xs font-bold uppercase border-0"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    SIGN UP
                  </Button>
                </Link>
              </div>
            ))}
          </nav>

          <button
            className="md:hidden p-2 text-court-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-court-black border-b border-[#1A1A1A] py-4 px-4 flex flex-col gap-1 z-40">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="px-2 py-3 text-court-white font-bold text-base"
                style={{ letterSpacing: "0.08em" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link
                href="/account"
                className="px-2 py-3 text-court-white font-bold text-base"
                style={{ letterSpacing: "0.08em" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                ACCOUNT
              </Link>
            )}
            {showUpgrade && (
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="outline"
                  className="w-full mt-2 rounded-[2px] border-hevini-red text-hevini-red hover:bg-hevini-red hover:text-white font-bold uppercase"
                  style={{ letterSpacing: "0.1em" }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  UPGRADE
                </Button>
              </Link>
            )}
            {!loading && (isLoggedIn ? (
              <>
                <p className="text-[11px] text-net-grey px-2 mt-2 truncate">{firstName ?? email}</p>
                <Button
                  variant="outline"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full mt-1 rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white font-bold uppercase"
                  style={{ letterSpacing: "0.1em" }}
                >
                  LOGOUT
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full mt-2 rounded-[2px] border-[#333] text-net-grey hover:border-court-white hover:text-court-white font-bold uppercase"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    LOGIN
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    className="w-full mt-2 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    SIGN UP
                  </Button>
                </Link>
              </>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <WelcomeModal />
      <ChatBot />

      <footer className="bg-court-black border-t border-[#1A1A1A] text-court-white py-12 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={signatureLogo} alt="" className="h-9 w-9 object-contain" />
            <span
              className="font-display font-black text-lg text-court-white"
              style={{ letterSpacing: "0.12em" }}
            >
              10IS
            </span>
          </div>
          <p className="text-xs uppercase text-net-grey" style={{ letterSpacing: "0.15em" }}>
            Powered by Hevini Sporting
          </p>

          {/* Nav links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6">
            {[
              { label: "ABOUT", href: "/about" },
              { label: "PRICING", href: "/pricing" },
              { label: "PRIVACY", href: "/privacy" },
              { label: "TERMS", href: "/terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-net-grey hover:text-court-white transition-colors"
                style={{ letterSpacing: "0.1em" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Social icons */}
          <div className="flex items-center justify-center gap-5 mt-5">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/10is.app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="10IS on Instagram"
              className="text-net-grey hover:text-court-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@10is.app"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="10IS on TikTok"
              className="text-net-grey hover:text-court-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.07a8.16 8.16 0 0 0 4.77 1.52V7.15a4.85 4.85 0 0 1-1-.46z" />
              </svg>
            </a>
          </div>

          <p className="text-xs text-net-grey mt-6">
            &copy; {new Date().getFullYear()} Hevini Sporting. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
