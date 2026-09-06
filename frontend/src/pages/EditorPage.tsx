import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LivePreview } from "@/components/Editor/LivePreview";
import { SourcePanel } from "@/components/Editor/SourcePanel";
import { ScreenPicker } from "@/components/Editor/ScreenPicker";
import { RenderPanel } from "@/components/Editor/RenderPanel";
import { BrandFields, FormatPicker, LinkFields, LogoField, Section, TextFields } from "@/components/Editor/Fields";
import { useEditor } from "@/hooks/useEditor";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/lib/utils";
import type { AspectRatio } from "@/types";

/**
 * The template on the left, playing with whatever is in it; what goes in
 * it on the right. Every change is visible before anything is rendered.
 */
export default function EditorPage() {
  const { templateId = "" } = useParams();
  const editor = useEditor(templateId);
  const store = useProjectStore();
  const [previewAspect, setPreviewAspect] = useState<AspectRatio | null>(null);

  const { template } = editor;

  // Entering a template resets the aspect choice to what it supports.
  useEffect(() => {
    if (!template) return;
    const current = useProjectStore.getState();
    if (current.templateId !== template.id) {
      const preferred: AspectRatio = template.aspects.includes("9:16") ? "9:16" : (template.aspects[0] as AspectRatio);
      current.setTemplate(template.id, [preferred]);
    }
  }, [template]);

  if (!template) return <Navigate to="/" replace />;
  if (!editor.input) return null;

  const shownAspect =
    previewAspect && template.aspects.includes(previewAspect)
      ? previewAspect
      : (store.aspects.find((aspect) => template.aspects.includes(aspect)) ?? (template.aspects[0] as AspectRatio));
  const portrait = shownAspect === "9:16";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <Link to="/" className="mb-1 inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-200">
            <ArrowLeft className="size-3.5" />
            All templates
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">{template.name}</h1>
          <p className="text-sm text-mist-400">{template.tagline}</p>
        </div>
        <div role="tablist" aria-label="Preview format" className="flex rounded-xl border border-white/8 bg-white/3 p-1">
          {template.aspects.map((aspect) => (
            <button key={aspect} role="tab" aria-selected={shownAspect === aspect} onClick={() => setPreviewAspect(aspect)} className={cn("rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors", shownAspect === aspect ? "bg-brand-500/18 text-white" : "text-mist-400 hover:text-mist-200")}>
              {aspect}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className={cn("mx-auto", portrait ? "max-w-[360px]" : "w-full")}>
            <LivePreview template={template} input={editor.input} aspect={shownAspect} />
          </div>
        </div>

        <div className="space-y-7">
          <Section title="Your product" hint="website · App Store · files">
            <SourcePanel
              phase={editor.sourcePhase}
              error={editor.sourceError}
              sourceLabel={store.sourceLabel}
              screenCount={store.assets.length}
              onUrl={(url) => void editor.captureUrl(url)}
              onFiles={(files) => void editor.uploadFiles(files)}
              onCancel={editor.cancelSource}
              onClear={store.clearContent}
            />
          </Section>

          {store.assets.length > 0 ? (
            <Section title="Screens">
              <ScreenPicker assets={store.assets} selected={store.screenIds} max={template.slots.screens.max} surface={template.slots.screens.surface} onChange={store.setScreenIds} />
            </Section>
          ) : null}

          {template.slots.logo !== "none" ? (
            <Section title="Logo">
              <LogoField logo={store.logo} required={template.slots.logo === "required"} onUpload={editor.uploadLogo} onClear={() => store.setLogo(null)} />
            </Section>
          ) : null}

          <Section title="Brand">
            <BrandFields name={store.brandName} primary={store.primary} accent={store.accent} showColours={template.slots.accent} onChange={store.setBrand} />
          </Section>

          {template.slots.headline || template.slots.subline ? (
            <Section title="Text">
              <TextFields headline={store.headline} subline={store.subline} showHeadline={template.slots.headline} showSubline={template.slots.subline} onChange={store.setCopy} />
            </Section>
          ) : null}

          {template.slots.cta ? (
            <Section title="Where it sends people" hint="end card + QR code">
              <LinkFields links={store.links} productName={store.brandName} onChange={store.setLinks} />
            </Section>
          ) : null}

          <Section title="Formats">
            <FormatPicker available={template.aspects} selected={store.aspects} onChange={store.setAspects} />
          </Section>

          <RenderPanel
            jobId={store.jobId}
            status={editor.status}
            estimate={editor.estimate}
            starting={editor.starting}
            missing={editor.missing}
            error={editor.generateError ?? editor.pollError}
            aspects={store.aspects}
            onGenerate={() => void editor.generate()}
            onReset={() => store.setJobId(null)}
          />
        </div>
      </div>
    </div>
  );
}
