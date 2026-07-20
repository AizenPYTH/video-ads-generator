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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={isNearLimit ? "text-amber-600" : "text-muted-foreground"}>
            {used} / {limit}
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} />
      </CardContent>
    </Card>
  );
}

type UsageMetersProps = {
  quotas: Array<{ label: string; used: number; limit: number }>;
};

export function UsageMeters({ quotas }: UsageMetersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {quotas.map((q) => (
        <UsageMeter key={q.label} label={q.label} used={q.used} limit={q.limit} />
      ))}
    </div>
  );
}
