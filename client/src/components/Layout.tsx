import { Link, useLocation } from "wouter";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatBot } from "@/components/ChatBot";
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

          <nav className="hidden md:flex items-center gap-8">
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
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-net-grey max-w-[140px] truncate">{firstName ?? email}</span>
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
            )}
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
            {isLoggedIn ? (
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
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

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
          <p className="text-xs text-net-grey mt-6">
            &copy; {new Date().getFullYear()} Hevini Sporting. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
