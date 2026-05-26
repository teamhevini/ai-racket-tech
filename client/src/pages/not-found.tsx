import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-court-black flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <p
          className="text-hevini-red text-[10px] font-bold uppercase"
          style={{ letterSpacing: "0.15em" }}
        >
          404
        </p>
        <h1
          className="font-display font-black text-4xl md:text-5xl text-court-white uppercase"
          style={{ letterSpacing: "0.04em" }}
        >
          Page Not Found
        </h1>
        <p className="text-net-grey text-sm max-w-xs mx-auto">
          That page doesn't exist. Head back to get your string setup.
        </p>
        <Link href="/">
          <Button
            className="bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0 h-11 px-8"
            style={{ letterSpacing: "0.1em" }}
          >
            GO HOME
          </Button>
        </Link>
      </div>
    </div>
  );
}
