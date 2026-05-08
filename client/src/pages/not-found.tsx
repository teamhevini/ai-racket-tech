import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black text-court-white mb-4" style={{ letterSpacing: "0.04em" }}>
        404
      </h1>
      <p className="text-net-grey text-lg mb-8">Page not found.</p>
      <Link href="/">
        <Button className="bg-hevini-red hover:bg-hevini-red-dark text-white border-0">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
