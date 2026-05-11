import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Racket } from '@shared/schema';

export default function Rackets() {
  const [q, setQ] = useState('');

  const { data: rackets = [], isLoading } = useQuery<Racket[]>({
    queryKey: ['rackets', q],
    queryFn: async () => {
      const res = await fetch(`/api/rackets/search?q=${encodeURIComponent(q)}`);
      return res.json();
    },
  });

  const grouped = rackets.reduce<Record<string, Racket[]>>((acc, r) => {
    acc[r.brand] = [...(acc[r.brand] ?? []), r];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-court-black pt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-1">Racket database.</h1>
          <p className="text-net-grey text-sm">{rackets.length} frames indexed.</p>
        </div>

        {/* Search */}
        <div className="relative mb-10 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-net-grey" />
          <Input
            placeholder="Search by brand or model..."
            className="pl-9"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-net-grey text-sm animate-pulse">Loading...</div>
        ) : rackets.length === 0 ? (
          <p className="text-net-grey text-sm">No results for "{q}".</p>
        ) : q ? (
          /* Flat list when searching */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rackets.map((r, i) => (
              <RacketCard key={r.id} racket={r} index={i} />
            ))}
          </div>
        ) : (
          /* Grouped by brand when browsing */
          <div className="space-y-10">
            {Object.entries(grouped).map(([brand, frames]) => (
              <div key={brand}>
                <p className="text-[11px] font-black uppercase tracking-widest text-hevini-red mb-4">{brand}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {frames.map((r, i) => (
                    <RacketCard key={r.id} racket={r} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RacketCard({ racket: r, index }: { racket: Racket; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className="border border-border bg-[#111] p-4 hover:border-[#333] transition-colors"
      style={{ borderRadius: '2px' }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-hevini-red mb-1">{r.brand}</p>
      <p className="text-sm font-semibold text-white leading-snug mb-3">{r.model}</p>
      <div className="space-y-1">
        <SpecRow label="Head" value={`${r.headSize} sq in`} />
        <SpecRow label="Pattern" value={r.stringPattern ?? '—'} />
        <SpecRow label="Weight" value={r.weightUnstrung ? `${r.weightUnstrung}g` : '—'} />
        <SpecRow label="RA" value={r.stiffnessRa ? String(r.stiffnessRa) : '—'} />
        <SpecRow label="Tension" value={r.recTensionMin && r.recTensionMax ? `${r.recTensionMin}–${r.recTensionMax} lbs` : '—'} />
      </div>
    </motion.div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-net-grey uppercase tracking-wider">{label}</span>
      <span className="text-[11px] text-white font-medium">{value}</span>
    </div>
  );
}
