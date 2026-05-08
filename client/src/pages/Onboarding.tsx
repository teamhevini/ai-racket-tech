import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RacketSearch } from "@/components/RacketSearch";
import { useCreateRecommendation } from "@/hooks/use-recommend";
import type { OnboardingInputs } from "@shared/routes";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];
const PLAYSTYLES = ["Aggressive Baseliner", "All-Court", "Serve & Volley", "Defensive"];
const GOALS = ["More Spin", "More Power", "More Control", "More Comfort", "Durability"];
const SWING_SPEEDS = ["Slow", "Medium", "Fast", "Very Fast"];
const INJURY_RISKS = ["None", "Tennis Elbow", "Wrist Pain", "Shoulder Pain"];
const FREQUENCIES = ["1-2", "3-4", "5-6", "7+"];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { mutate: createRecommendation, isPending } = useCreateRecommendation();

  const [form, setForm] = useState<OnboardingInputs>({
    racketId: null,
    level: "",
    playstyle: "",
    goals: [],
    swingSpeed: "",
    injuryRisk: "None",
    frequency: "",
    stringHistory: "",
    tensionHistory: "",
  });

  const toggleGoal = (goal: string) => {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals?.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...(prev.goals || []), goal],
    }));
  };

  const handleSubmit = () => {
    createRecommendation(form, {
      onSuccess: (data) => {
        navigate(`/recommendation/${data.runId}`);
      },
    });
  };

  return (
    <div className="min-h-screen bg-court-black text-court-white py-12">
      <div className="container max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h1 className="font-display font-black text-4xl mb-2" style={{ letterSpacing: "0.04em" }}>
              GET YOUR SETUP
            </h1>
            <p className="text-net-grey">Tell us about your game and racket.</p>
          </div>

          {/* Racket Search */}
          <Section title="Your Racket">
            <RacketSearch
              value={form.racketId ?? null}
              onChange={(id) => setForm((prev) => ({ ...prev, racketId: id }))}
            />
          </Section>

          {/* Level */}
          <Section title="Playing Level">
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((level) => (
                <OptionButton
                  key={level}
                  label={level}
                  selected={form.level === level}
                  onClick={() => setForm((prev) => ({ ...prev, level }))}
                />
              ))}
            </div>
          </Section>

          {/* Playstyle */}
          <Section title="Playstyle">
            <div className="grid grid-cols-2 gap-2">
              {PLAYSTYLES.map((style) => (
                <OptionButton
                  key={style}
                  label={style}
                  selected={form.playstyle === style}
                  onClick={() => setForm((prev) => ({ ...prev, playstyle: style }))}
                />
              ))}
            </div>
          </Section>

          {/* Goals */}
          <Section title="Goals (select all that apply)">
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((goal) => (
                <OptionButton
                  key={goal}
                  label={goal}
                  selected={form.goals?.includes(goal) ?? false}
                  onClick={() => toggleGoal(goal)}
                />
              ))}
            </div>
          </Section>

          {/* Swing Speed */}
          <Section title="Swing Speed">
            <div className="grid grid-cols-2 gap-2">
              {SWING_SPEEDS.map((speed) => (
                <OptionButton
                  key={speed}
                  label={speed}
                  selected={form.swingSpeed === speed}
                  onClick={() => setForm((prev) => ({ ...prev, swingSpeed: speed }))}
                />
              ))}
            </div>
          </Section>

          {/* Injury Risk */}
          <Section title="Injury History">
            <div className="grid grid-cols-2 gap-2">
              {INJURY_RISKS.map((risk) => (
                <OptionButton
                  key={risk}
                  label={risk}
                  selected={form.injuryRisk === risk}
                  onClick={() => setForm((prev) => ({ ...prev, injuryRisk: risk }))}
                />
              ))}
            </div>
          </Section>

          {/* Frequency */}
          <Section title="Hours/Week on Court">
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((freq) => (
                <OptionButton
                  key={freq}
                  label={`${freq}h`}
                  selected={form.frequency === freq}
                  onClick={() => setForm((prev) => ({ ...prev, frequency: freq }))}
                />
              ))}
            </div>
          </Section>

          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full h-14 bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] text-sm font-bold uppercase border-0"
            style={{ letterSpacing: "0.1em" }}
          >
            {isPending ? "Generating..." : "Get My Recommendation →"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase text-net-grey" style={{ letterSpacing: "0.12em" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium rounded-[2px] border transition-colors text-left ${
        selected
          ? "bg-hevini-red border-hevini-red text-white"
          : "bg-transparent border-[#2A2A2A] text-net-grey hover:border-[#444] hover:text-court-white"
      }`}
    >
      {label}
    </button>
  );
}
