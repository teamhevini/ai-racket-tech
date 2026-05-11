import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-court-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="text-center max-w-4xl w-full"
        >
          <h1 className="text-[clamp(80px,18vw,180px)] font-black leading-none tracking-tighter text-white mb-6 select-none">
            10IS
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xl md:text-2xl font-light text-net-grey mb-14 tracking-tight"
          >
            Know your setup.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 bg-hevini-red text-white font-bold tracking-widest uppercase px-10 py-4 text-sm hover:bg-red-700 transition-colors no-underline"
              style={{ borderRadius: '2px' }}
            >
              Get My Recommendation
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/rackets"
              className="inline-flex items-center justify-center gap-2 border border-border text-white font-bold tracking-widest uppercase px-8 py-4 text-sm hover:bg-secondary transition-colors no-underline"
              style={{ borderRadius: '2px' }}
            >
              Browse Rackets
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="border-t border-[#1a1a1a] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-6 text-[11px] text-net-grey tracking-widest uppercase">
            <Link href="/rackets" className="hover:text-white transition-colors no-underline">Racket Database</Link>
            <Link href="/stringers" className="hover:text-white transition-colors no-underline">Find a Stringer</Link>
          </div>
          <p className="text-[11px] text-[#444] tracking-widest uppercase">Powered by Hevini Sporting</p>
        </div>
      </div>
    </div>
  );
}
