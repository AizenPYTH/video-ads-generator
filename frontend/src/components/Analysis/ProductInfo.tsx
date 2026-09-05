import { Card, CardContent, CardHeader, CardTitle } from "@/components/Common/Card";
import { Badge } from "@/components/Common/Badge";
import { titleCase } from "@/utils/formatting";
import type { ProductAnalysis } from "@/types";

const SWATCHES = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["background", "Background"],
  ["text", "Text"],
] as const;

export const ProductInfo: React.FC<{ analysis: ProductAnalysis }> = ({
  analysis,
}) => (
  <div className="grid items-start gap-5 lg:grid-cols-3">
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{titleCase(analysis.type)}</Badge>
          <Badge tone="accent">{titleCase(analysis.tone)}</Badge>
        </div>
        <CardTitle className="pt-1 text-2xl">{analysis.name}</CardTitle>
        <p className="text-sm leading-relaxed text-mist-400">
          {analysis.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="mb-2.5 text-xs font-semibold tracking-wider text-mist-400 uppercase">
            Features found
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {analysis.features.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-white/7 bg-white/3 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {feature.title}
                  </p>
                  <span
                    className={
                      "mt-0.5 size-1.5 shrink-0 rounded-full " +
                      (feature.importance === "high"
                        ? "bg-accent-400"
                        : feature.importance === "medium"
                          ? "bg-brand-400"
                          : "bg-white/25")
                    }
                    title={`${feature.importance} importance`}
                  />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-mist-400">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2.5 text-xs font-semibold tracking-wider text-mist-400 uppercase">
            Selling points
          </h4>
          <ul className="flex flex-wrap gap-2">
            {analysis.keyPoints.map((point) => (
              <li
                key={point}
                className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-sm text-mist-200"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>

    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Palette</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SWATCHES.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span
                className="size-8 shrink-0 rounded-lg border border-white/12"
                style={{ background: analysis.colorPalette[key] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-mist-200">{label}</p>
                <p className="font-mono text-xs text-mist-400 uppercase">
                  {analysis.colorPalette[key]}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {analysis.assets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Captures ({analysis.assets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {analysis.assets.slice(0, 6).map((asset) => (
                <img
                  key={asset.id}
                  src={asset.url}
                  alt={asset.label}
                  loading="lazy"
                  className="aspect-9/16 w-full rounded-lg border border-white/10 object-cover object-top"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  </div>
);
