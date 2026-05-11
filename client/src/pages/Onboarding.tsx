import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCreateRecommendation, type OnboardingInput } from '@/hooks/useRecommendation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Racket } from '@shared/schema';

const GOALS = ['Topspin', 'Flat power', 'Control', 'Comfort', 'Durability', 'All-round'];
const INJURIES = ['Tennis elbow', 'Shoulder pain', 'Wrist issues', 'None'];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<OnboardingInput>>({
    goals: [],
    injuryRisk: [],
  });
  const [racketQuery, setRacketQuery] = useState('');
  const [selectedRacket, setSelectedRacket] = useState<Racket | null>(null);
  const recommend = useCreateRecommendation();

  const { data: racketResults } = useQuery<Racket[]>({
    queryKey: ['rackets', racketQuery],
    queryFn: async () => {
      if (!racketQuery.trim()) return [];
      const res = await fetch(`/api/rackets/search?q=${encodeURIComponent(racketQuery)}`);
      return res.json();
    },
    enabled: racketQuery.length > 1,
  });

  function toggleGoal(g: string) {
    setForm(f => ({
      ...f,
      goals: f.goals?.includes(g) ? f.goals.filter(x => x !== g) : [...(f.goals ?? []), g],
    }));
  }

  function toggleInjury(inj: string) {
    setForm(f => ({
      ...f,
      injuryRisk: f.injuryRisk?.includes(inj) ? f.injuryRisk.filter(x => x !== inj) : [...(f.injuryRisk ?? []), inj],
    }));
  }

  async function submit() {
    const input: OnboardingInput = {
      racketId: selectedRacket?.id,
      racketName: selectedRacket ? `${selectedRacket.brand} ${selectedRacket.model}` : form.racketName,
      goals: form.goals ?? [],
      swingSpeed: form.swingSpeed ?? 'medium',
      playFrequency: form.playFrequency ?? 'twice_week',
      injuryRisk: form.injuryRisk ?? [],
      stringHistory: form.stringHistory,
      budget: form.budget,
    };

    try {
      const result = await recommend.mutateAsync(input);
      navigate(`/recommendation/${result.runId}`);
    } catch {
      alert('Something went wrong. Please try again.');
    }
  }

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-court-black pt-16 flex flex-col items-center">
      <div className="w-full max-w-lg px-6 py-10">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-[10px] text-net-grey uppercase tracking-widest mb-2">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? 'Your Racket' : step === 2 ? 'Playstyle' : 'History & Health'}</span>
          </div>
          <div className="h-px bg-[#1a1a1a] w-full">
            <motion.div
              className="h-px bg-hevini-red"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black tracking-tight mb-1">Your racket.</h2>
              <p className="text-net-grey text-sm mb-8">Search for your frame or skip.</p>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Search racket</Label>
                  <Input
                    placeholder="e.g. Wilson Blade 98, Babolat Pure Aero..."
                    value={racketQuery}
                    onChange={e => setRacketQuery(e.target.value)}
                  />
                </div>

                {racketResults && racketResults.length > 0 && !selectedRacket && (
                  <div className="border border-border bg-[#111] max-h-48 overflow-y-auto" style={{ borderRadius: '2px' }}>
                    {racketResults.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedRacket(r); setRacketQuery(`${r.brand} ${r.model}`); }}
                        className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-[#1a1a1a] last:border-0"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-hevini-red">{r.brand}</span>
                        <p className="text-sm text-white mt-0.5">{r.model}</p>
                        <p className="text-[11px] text-net-grey">{r.headSize} sq in · {r.stringPattern} · {r.weightUnstrung}g</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRacket && (
                  <div className="border border-hevini-red/40 bg-hevini-red/5 p-4" style={{ borderRadius: '2px' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-hevini-red">{selectedRacket.brand}</span>
                        <p className="text-white font-semibold mt-0.5">{selectedRacket.model}</p>
                        <p className="text-[11px] text-net-grey mt-1">
                          {selectedRacket.headSize} sq in · {selectedRacket.stringPattern} · {selectedRacket.weightUnstrung}g · RA{selectedRacket.stiffnessRa}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedRacket(null); setRacketQuery(''); }} className="text-net-grey hover:text-white text-xs">Clear</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Next →
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black tracking-tight mb-1">Your game.</h2>
              <p className="text-net-grey text-sm mb-8">What matters to you on court.</p>

              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Goals (pick all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map(g => (
                      <button
                        key={g}
                        onClick={() => toggleGoal(g)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                          form.goals?.includes(g)
                            ? 'bg-hevini-red border-hevini-red text-white'
                            : 'border-border text-net-grey hover:text-white hover:border-white'
                        }`}
                        style={{ borderRadius: '2px' }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Swing speed</Label>
                  <Select value={form.swingSpeed} onValueChange={v => setForm(f => ({ ...f, swingSpeed: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select swing speed" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow — compact, defensive</SelectItem>
                      <SelectItem value="medium">Medium — all-round baseline</SelectItem>
                      <SelectItem value="fast">Fast — aggressive topspin</SelectItem>
                      <SelectItem value="very_fast">Very fast — Tour-level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Play frequency</Label>
                  <Select value={form.playFrequency} onValueChange={v => setForm(f => ({ ...f, playFrequency: v }))}>
                    <SelectTrigger><SelectValue placeholder="How often do you play?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once_week">Once a week</SelectItem>
                      <SelectItem value="twice_week">Twice a week</SelectItem>
                      <SelectItem value="three_plus">3+ times a week</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-10 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => setStep(3)}>Next →</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black tracking-tight mb-1">Health & history.</h2>
              <p className="text-net-grey text-sm mb-8">Helps us protect you and personalise your setup.</p>

              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Injury concerns</Label>
                  <div className="flex flex-wrap gap-2">
                    {INJURIES.map(inj => (
                      <button
                        key={inj}
                        onClick={() => toggleInjury(inj)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                          form.injuryRisk?.includes(inj)
                            ? 'bg-hevini-red border-hevini-red text-white'
                            : 'border-border text-net-grey hover:text-white hover:border-white'
                        }`}
                        style={{ borderRadius: '2px' }}
                      >
                        {inj}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">String history (optional)</Label>
                  <Textarea
                    placeholder="e.g. I've been using Luxilon ALU Power 125 at 52 lbs for 2 years..."
                    value={form.stringHistory ?? ''}
                    onChange={e => setForm(f => ({ ...f, stringHistory: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Budget preference (optional)</Label>
                  <Select value={form.budget} onValueChange={v => setForm(f => ({ ...f, budget: v }))}>
                    <SelectTrigger><SelectValue placeholder="Any budget" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget — under $10</SelectItem>
                      <SelectItem value="mid">Mid-range — $10–$20</SelectItem>
                      <SelectItem value="premium">Premium — $20+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-10 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={submit} disabled={recommend.isPending}>
                  {recommend.isPending ? 'Analysing...' : 'Get My Setup →'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
