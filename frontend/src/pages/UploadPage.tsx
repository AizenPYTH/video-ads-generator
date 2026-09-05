import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/Common/Card";
import { ErrorState } from "@/components/Common/ErrorState";
import { URLInput } from "@/components/Upload/URLInput";
import { FileDropzone } from "@/components/Upload/FileDropzone";
import { UploadProgress } from "@/components/Upload/UploadProgress";
import { useUpload } from "@/hooks/useUpload";
import { cn } from "@/lib/utils";

type Method = "url" | "file";

export default function UploadPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("url");
  const { stage, error, fromUrl, fromFiles, busy } = useUpload();

  const go = (result: unknown): void => {
    if (result) navigate("/analysis");
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Capture your product
      </h1>
      <p className="mt-2 text-mist-400">
        We open your site in a real browser and grab the shots the ad will use.
      </p>

      <Card className="mt-8">
        <CardContent className="space-y-6 pt-6">
          <div
            role="tablist"
            aria-label="Capture method"
            className="inline-flex rounded-xl border border-white/8 bg-white/3 p-1"
          >
            {(
              [
                ["url", "From a URL"],
                ["file", "Upload screenshots"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={method === value}
                disabled={busy}
                onClick={() => setMethod(value)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
                  method === value
                    ? "bg-brand-500/18 text-white"
                    : "text-mist-400 hover:text-mist-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {method === "url" ? (
            <URLInput
              loading={busy}
              onSubmit={(url) => {
                void fromUrl(url).then(go);
              }}
            />
          ) : (
            <FileDropzone
              loading={busy}
              onSubmit={(files) => {
                void fromFiles(files).then(go);
              }}
            />
          )}

          {busy ? (
            <div className="border-t border-white/6 pt-5">
              <UploadProgress stage={stage} />
              {method === "url" ? (
                <p className="mt-3 text-xs text-mist-400/70">
                  Heavy marketing sites can take 20–40 seconds to settle.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <ErrorState message={error} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
