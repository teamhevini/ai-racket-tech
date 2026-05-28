import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/contexts/UserContext";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

export default function Login() {
  const [, navigate] = useLocation();
  const { refetch } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }
      refetch();
      navigate("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={signatureLogo} alt="10IS" className="h-10 w-10 object-contain mb-4" />
          <h1
            className="text-2xl font-black text-court-white uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            SIGN IN
          </h1>
          <p className="text-net-grey text-sm mt-1">
            Welcome back to 10IS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-[11px] font-bold uppercase text-net-grey"
              style={{ letterSpacing: "0.1em" }}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="h-11 rounded-[2px] bg-[#111] border border-[#2A2A2A] text-court-white placeholder:text-[#444] focus-visible:ring-1 focus-visible:ring-hevini-red focus-visible:border-hevini-red"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-[11px] font-bold uppercase text-net-grey"
              style={{ letterSpacing: "0.1em" }}
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-11 rounded-[2px] bg-[#111] border border-[#2A2A2A] text-court-white placeholder:text-[#444] focus-visible:ring-1 focus-visible:ring-hevini-red focus-visible:border-hevini-red"
            />
          </div>

          {error && (
            <p className="text-hevini-red text-sm font-medium">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 text-xs mt-2"
            style={{ letterSpacing: "0.1em" }}
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </Button>
        </form>

        <p className="text-center text-sm text-net-grey mt-6">
          Don't have an account?{" "}
          <Link href="/signup" className="text-court-white font-semibold hover:text-hevini-red transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
