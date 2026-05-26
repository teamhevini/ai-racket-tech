import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatBot } from "@/components/ChatBot";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              src="/logo-signature.png"
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
            <Link href="/onboarding">
              <Button
                size="sm"
                className="h-9 px-5 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] text-xs font-bold uppercase border-0"
                style={{ letterSpacing: "0.1em" }}
              >
                GET SETUP
              </Button>
            </Link>
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
            <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
              <Button
                className="w-full mt-2 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
                style={{ letterSpacing: "0.1em" }}
              >
                GET SETUP
              </Button>
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <ChatBot />

      <footer className="bg-chalk text-court-black py-12 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/logo-signature.png" alt="" className="h-9 w-9 object-contain" />
            <span
              className="font-display font-black text-lg text-court-black"
              style={{ letterSpacing: "0.12em" }}
            >
              10IS
            </span>
          </div>
          <p className="text-xs uppercase text-[#444]" style={{ letterSpacing: "0.15em" }}>
            Powered by Hevini Sporting
          </p>
          <p className="text-xs text-[#555] mt-6">
            &copy; {new Date().getFullYear()} Hevini Sporting. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
