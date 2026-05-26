import { Link } from "wouter";
import { ArrowRight, Activity, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col bg-court-black text-court-white">
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-40 border-b border-[#1A1A1A]">
        <div className="container px-4 mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1
                className="font-display font-black leading-[0.95] text-court-white mb-6 text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
                style={{ letterSpacing: "0.04em" }}
              >
                10IS
              </h1>
              <p
                className="text-net-grey font-display font-bold text-3xl sm:text-4xl md:text-5xl"
                style={{ letterSpacing: "-0.01em" }}
              >
                Know your setup.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
            >
              <Link href="/onboarding">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] text-xs font-bold uppercase border-0 w-full sm:w-auto"
                  style={{ letterSpacing: "0.1em" }}
                >
                  GET MY RECOMMENDATION <ArrowRight className="ml-3 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/rackets">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 bg-transparent border-[1.5px] border-court-white text-court-white hover:bg-court-white hover:text-court-black rounded-[2px] text-xs font-bold uppercase w-full sm:w-auto"
                  style={{ letterSpacing: "0.1em" }}
                >
                  BROWSE RACKETS
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-hevini-red/5 rounded-full blur-3xl -z-10" />
      </section>

      <section className="bg-court-black py-20">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2
              className="font-display font-bold text-3xl md:text-4xl text-court-white uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              Built for the Court
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={Activity}
              title="Physics-Based"
              description="We analyze your racket's specs (RA stiffness, beam width, pattern) to find compatible strings."
            />
            <FeatureCard
              icon={Zap}
              title="Playstyle Matched"
              description="Whether you're a heavy spinner or a flat hitter, we optimize for your mechanics."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Injury Prevention"
              description="History of tennis elbow? We prioritize comfort and softness in our recommendations."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-[#111] p-6 border border-[#1E1E1E] hover:border-hevini-red transition-colors duration-200 rounded-[4px]"
    >
      <div className="w-10 h-10 bg-hevini-red/10 border border-hevini-red/30 flex items-center justify-center mb-5 rounded-[2px]">
        <Icon className="w-5 h-5 text-hevini-red" />
      </div>
      <h3
        className="text-base font-display font-bold mb-2 text-court-white uppercase"
        style={{ letterSpacing: "0.06em" }}
      >
        {title}
      </h3>
      <p className="text-net-grey leading-relaxed text-sm">{description}</p>
    </motion.div>
  );
}
