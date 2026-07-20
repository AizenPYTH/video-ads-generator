export type UploadedImage = {
  url: string;
  path?: string;
};

export async function uploadImageWithPath(
  file: File,
  folder: string,
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    path?: string;
    error?: { message?: string } | string;
  } | null;

  if (!response.ok || !payload?.url) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message;
    throw new Error(message ?? "Échec du téléversement de l'image.");
  }

  return { url: payload.url, path: payload.path };
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const uploaded = await uploadImageWithPath(file, folder);
  return uploaded.url;
}
