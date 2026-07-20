"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UsageMeterProps = {
  label: string;
  used: number;
  limit: number;
};

export function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = percent >= 80;

  return (
    <Card className={isNearLimit ? "border-amber-300/70" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <span className="text-xs font-medium text-muted-foreground">{percent} %</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percent} aria-label={`${label} : ${percent} % utilisé`} />
        <p className={isNearLimit ? "text-sm text-amber-700" : "text-sm text-muted-foreground"}>
          <span className="font-semibold text-foreground">{used}</span> utilisé
          {limit > 0 ? ` sur ${limit}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

type UsageMetersProps = {
  quotas: Array<{ label: string; used: number; limit: number }>;
};

export function UsageMeters({ quotas }: UsageMetersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {quotas.map((q) => (
        <UsageMeter key={q.label} label={q.label} used={q.used} limit={q.limit} />
      ))}
    </div>
  );
}
