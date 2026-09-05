import { Link } from "react-router-dom";
import { ArrowRight, Clapperboard, Link2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Badge } from "@/components/Common/Badge";

const STEPS = [
  {
    icon: Link2,
    title: "Point at your product",
    body: "Drop in a URL and we capture it in a real browser, mobile and desktop, section by section. No URL? Upload screenshots.",
  },
  {
    icon: Wand2,
    title: "Claude reads it",
    body: "Product type, real features, the actual colour palette, and the tone the design is already speaking in.",
  },
  {
    icon: Clapperboard,
    title: "Three different ads",
    body: "Not three rewrites of one script — a problem-solution arc, a feature run, and a hero-led benefit cascade.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="flex flex-col items-center py-20 text-center sm:py-28">
        <Badge tone="accent">
          <Sparkles className="size-3" />
          Claude + Remotion
        </Badge>

        <h1 className="mt-6 max-w-3xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Ship a video ad
          <span className="bg-linear-to-r from-brand-400 to-accent-300 bg-clip-text text-transparent">
            {" "}
            before your coffee lands
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist-400">
          Give it your product URL. Get a finished MP4 in 9:16, 16:9 and 1:1 —
          storyboarded, animated, and framed in a real device mockup.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/create">
              Create your ad
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="#how">See how it works</a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-mist-400/70">
          No account. Renders on your own backend.
        </p>
      </section>

      <section id="how" className="grid gap-5 pb-24 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="panel rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                <step.icon className="size-4" />
              </span>
              <span className="font-mono text-xs text-mist-400/60">
                0{index + 1}
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-white">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">
              {step.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
