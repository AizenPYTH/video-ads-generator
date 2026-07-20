export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

export const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

export function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 o";

  const units = ["o", "Kio", "Mio", "Gio"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`;
}

export type FileValidationOptions = {
  accept?: string[];
  extensions?: string[];
  maxSize?: number;
};

export function validateFile(
  file: File,
  { accept, extensions, maxSize }: FileValidationOptions,
): string | null {
  const lowerName = file.name.toLowerCase();
  const normalizedExtensions = extensions?.map((extension) =>
    extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`,
  );
  const matchesExtension =
    !normalizedExtensions?.length ||
    normalizedExtensions.some((extension) => lowerName.endsWith(extension));
  const matchesMime =
    !accept?.length ||
    accept.some((type) => {
      if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
      return file.type === type;
    });

  if (!matchesExtension || !matchesMime) {
    return `« ${file.name} » n'est pas dans un format accepté.`;
  }

  if (maxSize !== undefined && file.size > maxSize) {
    return `« ${file.name} » dépasse la taille maximale de ${formatBytes(maxSize)}.`;
  }

  return null;
}
