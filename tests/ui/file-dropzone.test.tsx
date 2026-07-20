// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileDropzone, type FileDropzoneProps } from "@/components/uploads/file-dropzone";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/features/imports/actions", () => ({
  createImportBatch: vi.fn(),
  processImportBatch: vi.fn(),
}));

afterEach(cleanup);

function file(name: string, type: string, contents = "value"): File {
  return new File([contents], name, { type, lastModified: 1 });
}

function inputControlledBy(element: HTMLElement): HTMLInputElement {
  const id = element.getAttribute("aria-controls");
  const input = id ? document.getElementById(id) : null;
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("The dropzone does not control a file input");
  }
  return input;
}

function StatefulFileDropzone(
  props: Omit<FileDropzoneProps, "files" | "onFilesChange">,
) {
  const [files, setFiles] = useState<File[]>([]);
  return <FileDropzone {...props} files={files} onFilesChange={setFiles} />;
}

describe("FileDropzone", () => {
  it("accepts a CSV file dropped on the dropzone", () => {
    render(
      <StatefulFileDropzone
        extensions={[".csv", ".xlsx"]}
        label="Importer un fichier"
      />,
    );
    const dropzone = screen.getByRole("button", { name: /Importer un fichier/i });
    const csv = file("annonces.csv", "text/csv");

    fireEvent.drop(dropzone, { dataTransfer: { files: [csv] } });

    expect(screen.getByRole("list", { name: "Fichiers sélectionnés" })).toBeTruthy();
    expect(screen.getByText("annonces.csv")).toBeTruthy();
  });

  it("accepts an XLSX file from the file input", () => {
    render(
      <StatefulFileDropzone
        extensions={[".csv", ".xlsx"]}
        label="Importer un fichier"
      />,
    );
    const dropzone = screen.getByRole("button", { name: /Importer un fichier/i });
    const xlsx = file(
      "annonces.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    fireEvent.change(inputControlledBy(dropzone), { target: { files: [xlsx] } });

    expect(screen.getByText("annonces.xlsx")).toBeTruthy();
  });

  it("rejects a wrong extension through generic validation", () => {
    render(
      <StatefulFileDropzone
        extensions={[".csv", ".xlsx"]}
        label="Importer un fichier"
      />,
    );
    const dropzone = screen.getByRole("button", { name: /Importer un fichier/i });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file("annonces.txt", "text/plain")] },
    });

    expect(screen.getByText(/annonces\.txt.*n'est pas dans un format accepté/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Fichiers sélectionnés" })).toBeNull();
  });

  it("replaces the selected single file and removes it", () => {
    render(
      <StatefulFileDropzone extensions={[".csv"]} label="Importer un fichier" />,
    );
    const dropzone = screen.getByRole("button", { name: /Importer un fichier/i });
    const input = inputControlledBy(dropzone);

    fireEvent.change(input, {
      target: { files: [file("premier.csv", "text/csv")] },
    });
    expect(screen.getByRole("button", { name: "Remplacer le fichier" })).toBeTruthy();

    fireEvent.change(input, {
      target: { files: [file("remplacement.csv", "text/csv", "new")] },
    });
    expect(screen.queryByText("premier.csv")).toBeNull();
    expect(screen.getByText("remplacement.csv")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retirer remplacement.csv" }));
    expect(screen.queryByRole("list", { name: "Fichiers sélectionnés" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remplacer le fichier" })).toBeNull();
  });
});

describe("ImportUpload validation", () => {
  it("rejects XLSM before any import action is called", async () => {
    const { ImportUpload } = await import(
      "@/features/imports/components/import-upload"
    );
    const actions = await import("@/features/imports/actions");
    render(<ImportUpload />);
    const dropzone = screen.getByRole("button", {
      name: /Déposez votre fichier d'import ici/i,
    });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [
          file(
            "macros.xlsm",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
          ),
        ],
      },
    });

    expect(screen.getByText("Les fichiers XLSM (macros) ne sont pas acceptés.")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Lancer l’import" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(actions.createImportBatch).not.toHaveBeenCalled();
    expect(actions.processImportBatch).not.toHaveBeenCalled();
  });
});
