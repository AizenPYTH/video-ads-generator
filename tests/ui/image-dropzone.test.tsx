// @vitest-environment jsdom

import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageDropzone } from "@/components/uploads/image-dropzone";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    const { fill, unoptimized, ...imageProps } = props;
    void fill;
    void unoptimized;
    return createElement("img", imageProps);
  },
}));

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:test-preview"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function image(name: string, contents = name, lastModified = 1): File {
  return new File([contents], name, {
    type: name.endsWith(".png") ? "image/png" : "image/jpeg",
    lastModified,
  });
}

function oversizedImage(name: string): File {
  const result = image(name);
  Object.defineProperty(result, "size", { value: 10 * 1024 * 1024 + 1 });
  return result;
}

function inputControlledBy(element: HTMLElement): HTMLInputElement {
  const id = element.getAttribute("aria-controls");
  const input = id ? document.getElementById(id) : null;
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("The dropzone does not control a file input");
  }
  return input;
}

function StatefulImageDropzone({ maxFiles = 12 }: { maxFiles?: number }) {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <ImageDropzone
      files={files}
      onFilesChange={setFiles}
      maxFiles={maxFiles}
      label="Ajouter des photos"
    />
  );
}

function dropzone(): HTMLElement {
  return screen.getByRole("button", { name: /Ajouter des photos/i });
}

function selectedImages(): HTMLElement {
  return screen.getByRole("list", {
    name: "Images sélectionnées, dans leur ordre d'envoi",
  });
}

describe("ImageDropzone", () => {
  it("accepts one image by drop and labels it Photo principale", () => {
    render(<StatefulImageDropzone />);

    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [image("face.jpg")] },
    });

    expect(
      screen.getByRole("img", { name: "Aperçu de Photo principale" }),
    ).toBeTruthy();
    expect(screen.getByText("Photo principale")).toBeTruthy();
    expect(screen.queryByText("face.jpg")).toBeNull();
  });

  it("accepts multiple images from the file input", () => {
    render(<StatefulImageDropzone />);
    const input = inputControlledBy(dropzone());

    fireEvent.change(input, {
      target: { files: [image("face.jpg"), image("dos.png")] },
    });

    expect(
      screen.getByRole("img", { name: "Aperçu de Photo principale" }),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Aperçu de Photo 2" })).toBeTruthy();
    expect(screen.getByText("Photo 2")).toBeTruthy();
  });

  it("prevents duplicate images with user-facing message", () => {
    render(<StatefulImageDropzone />);
    const duplicate = image("face.jpg", "same", 42);

    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [duplicate, duplicate] },
    });

    expect(
      screen.getAllByRole("img", { name: "Aperçu de Photo principale" }),
    ).toHaveLength(1);
    expect(screen.getByText(/déjà sélectionnée/i)).toBeTruthy();
  });

  it("removes an image", () => {
    render(<StatefulImageDropzone />);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [image("face.jpg")] },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Retirer Photo principale" }),
    );

    expect(
      screen.queryByRole("img", { name: "Aperçu de Photo principale" }),
    ).toBeNull();
    expect(
      screen.queryByRole("list", {
        name: "Images sélectionnées, dans leur ordre d'envoi",
      }),
    ).toBeNull();
  });

  it("reorders images with explicit arrow buttons", () => {
    render(<StatefulImageDropzone />);
    fireEvent.drop(dropzone(), {
      dataTransfer: {
        files: [image("un.jpg"), image("deux.jpg"), image("trois.jpg")],
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Déplacer Photo 2 vers la gauche" }),
    );

    const previewNames = within(selectedImages())
      .getAllByRole("img")
      .map((element) => element.getAttribute("alt"));
    expect(previewNames).toEqual([
      "Aperçu de Photo principale",
      "Aperçu de Photo 2",
      "Aperçu de Photo 3",
    ]);
  });

  it("moves the chosen principal image to index zero", () => {
    render(<StatefulImageDropzone />);
    fireEvent.drop(dropzone(), {
      dataTransfer: {
        files: [image("un.jpg"), image("deux.jpg"), image("trois.jpg")],
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Définir Photo 3 comme image principale",
      }),
    );

    const firstItem = within(selectedImages()).getAllByRole("listitem")[0];
    expect(
      within(firstItem).getByRole("img", { name: "Aperçu de Photo principale" }),
    ).toBeTruthy();
    expect(within(firstItem).getByText("Principale")).toBeTruthy();
  });

  it("reports max-count and max-size errors while keeping valid files", () => {
    render(<StatefulImageDropzone maxFiles={1} />);

    fireEvent.drop(dropzone(), {
      dataTransfer: {
        files: [
          image("valide.jpg"),
          image("en-trop.jpg"),
          oversizedImage("trop-lourde.jpg"),
        ],
      },
    });

    expect(
      screen.getByRole("img", { name: "Aperçu de Photo principale" }),
    ).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Aperçu de Photo 2" })).toBeNull();
    expect(screen.getByText(/au maximum 1 images/i)).toBeTruthy();
    expect(screen.getByText(/dépasse la taille maximale/i)).toBeTruthy();
  });

  it("hides raw filenames unless debug mode", () => {
    render(<StatefulImageDropzone />);

    fireEvent.drop(dropzone(), {
      dataTransfer: {
        files: [image("IMG_9876_very_long_camera_name.jpg")],
      },
    });

    expect(within(selectedImages()).getByText("Photo principale")).toBeTruthy();
    expect(
      within(selectedImages()).queryByText(
        "IMG_9876_very_long_camera_name.jpg",
      ),
    ).toBeNull();
  });
});
