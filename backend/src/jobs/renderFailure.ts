/**
 * Turns whatever the renderer threw into a sentence a person can act on.
 * The original error keeps going to the log in full; the job record and the
 * UI get this.
 */
interface Rule {
  test: RegExp;
  message: string;
}

const RULES: Rule[] = [
  {
    test: /delayRender|not cleared after|timed out after/i,
    message:
      "A screenshot, the logo or the 3D model took too long to load while rendering. Check that every image opens, then try again.",
  },
  {
    test: /WebGL|GPU|swiftshader|swangle|Could not create a WebGL context|THREE\.WebGLRenderer/i,
    message: "The renderer could not start a 3D context on this server. The service has been notified.",
  },
  {
    test: /Failed to load|Could not load|Unable to load|404|ERR_FILE_NOT_FOUND|no such file/i,
    message: "One of the images or the device model could not be found. Re-upload your screenshots and try again.",
  },
  {
    test: /out of memory|OOM|Target closed|Session closed|browser has disconnected|Page crashed/i,
    message: "The render ran out of memory. Try fewer formats at once, or a shorter video.",
  },
  {
    test: /ENOSPC|no space left/i,
    message: "The server ran out of disk space. Try again in a few minutes.",
  },
  {
    test: /ffmpeg|x264|encod/i,
    message: "The video was rendered but could not be encoded. Try again; if it keeps happening, the service has been notified.",
  },
  {
    test: /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|fetch failed/i,
    message: "The renderer could not reach the uploaded images. Try again in a moment.",
  },
];

export function describeRenderFailure(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const rule = RULES.find((candidate) => candidate.test.test(raw));
  return rule?.message ?? "Rendering failed for a reason we did not expect. Try again; the details are in the server log.";
}
