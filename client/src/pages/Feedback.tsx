import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

export default function Feedback() {
  const [location] = useLocation();
  const runId = new URLSearchParams(window.location.search).get('runId');

  const [power, setPower] = useState(3);
  const [control, setControl] = useState(3);
  const [comfort, setComfort] = useState(3);
  const [durability, setDurability] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationRunId: runId ? parseInt(runId) : undefined,
          ratingPower: power,
          ratingControl: control,
          ratingComfort: comfort,
          durabilityHours: durability ? parseInt(durability) : undefined,
          comments,
        }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-court-black pt-16 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black tracking-tight mb-2">Feedback received.</h2>
          <p className="text-net-grey text-sm mb-8">Thanks for helping us improve.</p>
          <Link href="/"><Button>Back to home</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-court-black pt-16">
      <div className="max-w-lg mx-auto px-6 py-10">

        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-1">Rate your setup.</h1>
          <p className="text-net-grey text-sm">
            {runId ? `Feedback for run #${runId}.` : 'General feedback.'}
          </p>
        </div>

        <div className="space-y-8">

          <RatingRow
            label="Power"
            value={power}
            onChange={setPower}
            description={['None', 'Low', 'OK', 'Good', 'Excellent'][power - 1]}
          />
          <RatingRow
            label="Control"
            value={control}
            onChange={setControl}
            description={['None', 'Low', 'OK', 'Good', 'Excellent'][control - 1]}
          />
          <RatingRow
            label="Comfort"
            value={comfort}
            onChange={setComfort}
            description={['None', 'Low', 'OK', 'Good', 'Excellent'][comfort - 1]}
          />

          <div>
            <Label className="mb-2 block">Hours until dead (optional)</Label>
            <Input
              type="number"
              placeholder="e.g. 12"
              value={durability}
              onChange={e => setDurability(e.target.value)}
              className="max-w-[120px]"
            />
          </div>

          <div>
            <Label className="mb-2 block">Comments (optional)</Label>
            <Textarea
              placeholder="Anything else about the feel, tension loss, or recommendation accuracy..."
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </div>

          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            size="lg"
            className="w-full"
          >
            {submit.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <Label>{label}</Label>
        <span className="text-xs text-white font-semibold">{value}/5 — {description}</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between mt-1">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className={`text-[9px] ${n === value ? 'text-hevini-red font-bold' : 'text-[#333]'}`}>{n}</span>
        ))}
      </div>
    </div>
  );
}
