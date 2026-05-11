import { useParams, Link } from 'wouter';
import { motion } from 'framer-motion';
import { useRecommendationRun } from '@/hooks/useRecommendation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MapPin, Share2 } from 'lucide-react';

type ConfidenceVariant = 'high' | 'medium' | 'estimated';

function confidenceVariant(c: string): ConfidenceVariant {
  if (c === 'HIGH') return 'high';
  if (c === 'MEDIUM') return 'medium';
  return 'estimated';
}

export default function Recommendation() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, error } = useRecommendationRun(runId);

  function share() {
    navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied.'));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-court-black pt-16 flex items-center justify-center">
        <p className="text-net-grey text-sm uppercase tracking-widest animate-pulse">Loading setup...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-court-black pt-16 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white font-bold mb-4">Setup not found.</p>
          <Link href="/onboarding"><Button>Start over</Button></Link>
        </div>
      </div>
    );
  }

  const output = run.outputJson as any;
  const { setup, alternatives = [], explanation, warnings = [], confidenceReason, confidence } = { ...output, confidence: run.confidence };

  return (
    <div className="min-h-screen bg-court-black pt-16">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <Badge variant={confidenceVariant(confidence)}>{confidence}</Badge>
            <span className="text-[11px] text-net-grey uppercase tracking-widest">{confidenceReason}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Your setup.</h1>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={share}
              className="flex items-center gap-1.5 text-[11px] text-net-grey hover:text-white uppercase tracking-widest transition-colors"
            >
              <Share2 size={12} /> Share
            </button>
            <Link
              href={`/feedback?runId=${runId}`}
              className="text-[11px] text-net-grey hover:text-white uppercase tracking-widest no-underline"
            >
              Leave feedback
            </Link>
          </div>
        </motion.div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6 border border-yellow-600/40 bg-yellow-900/10 p-4"
            style={{ borderRadius: '2px' }}
          >
            {warnings.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200 text-sm">{w}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Main setup */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Mains</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-net-grey uppercase tracking-widest mb-1">String family</p>
                <p className="text-white font-semibold">{setup?.mains?.stringFamily}</p>
              </div>
              <div>
                <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Examples</p>
                <div className="flex flex-wrap gap-2">
                  {(setup?.mains?.exampleStrings ?? []).map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-secondary px-2.5 py-1 text-court-white font-medium" style={{ borderRadius: '2px' }}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Gauge</p>
                  <p className="text-white text-sm font-medium">{setup?.mains?.gauge}</p>
                </div>
                <div>
                  <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Tension</p>
                  <p className="text-white text-sm font-medium">{setup?.mains?.tension}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {setup?.crosses && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Crosses <span className="text-net-grey font-normal normal-case text-xs tracking-normal ml-1">Hybrid</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-net-grey uppercase tracking-widest mb-1">String family</p>
                  <p className="text-white font-semibold">{setup.crosses.stringFamily}</p>
                </div>
                <div>
                  <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Examples</p>
                  <div className="flex flex-wrap gap-2">
                    {(setup.crosses.exampleStrings ?? []).map((s: string, i: number) => (
                      <span key={i} className="text-xs bg-secondary px-2.5 py-1 text-court-white font-medium" style={{ borderRadius: '2px' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Gauge</p>
                    <p className="text-white text-sm font-medium">{setup.crosses.gauge}</p>
                  </div>
                  <div>
                    <p className="text-xs text-net-grey uppercase tracking-widest mb-1">Tension</p>
                    <p className="text-white text-sm font-medium">{setup.crosses.tension}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6 border-l-2 border-hevini-red pl-4 py-1"
        >
          <p className="text-sm text-net-grey leading-relaxed">{explanation}</p>
        </motion.div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-net-grey mb-3">Alternatives</p>
            <div className="space-y-3">
              {alternatives.map((alt: any, i: number) => (
                <div key={i} className="border border-border p-4" style={{ borderRadius: '2px' }}>
                  <p className="text-xs font-bold text-white uppercase tracking-wide mb-1">{alt.stringFamily}</p>
                  <p className="text-[11px] text-net-grey mb-2">{alt.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(alt.exampleStrings ?? []).map((s: string, j: number) => (
                      <span key={j} className="text-[10px] bg-secondary px-2 py-0.5 text-net-grey" style={{ borderRadius: '2px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link href="/stringers" className="no-underline flex-1">
            <Button className="w-full" size="lg">
              <MapPin size={14} className="mr-2" /> Find a Stringer
            </Button>
          </Link>
          <Link href="/onboarding" className="no-underline">
            <Button variant="outline" size="lg">Start Over</Button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
