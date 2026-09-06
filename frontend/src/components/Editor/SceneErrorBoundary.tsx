import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  error: Error | null;
}

/**
 * Whatever goes wrong inside the 3D preview - a model that fails to load,
 * a lost WebGL context, an image that will not decode - stays inside this
 * box. The rest of the editor keeps working and the person is told what
 * happened in plain words; the details go to the console.
 */
export class SceneErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[preview] scene failed", error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const message = /webgl|context/i.test(this.state.error.message)
      ? "This browser could not start 3D rendering. The video will still render on the server."
      : /fetch|load|network|glb|gltf/i.test(this.state.error.message)
        ? "The device model could not be loaded. Check your connection and try again."
        : "The preview hit an error. The video will still render on the server.";
    return (
      <div role="alert" className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-6 text-center">
        <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
          <AlertTriangle className="size-5" />
        </span>
        <p className="max-w-xs text-sm text-mist-200">{message}</p>
        {this.props.onReset ? (
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
            className="text-xs text-mist-400 underline-offset-2 hover:text-white hover:underline"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }
}
