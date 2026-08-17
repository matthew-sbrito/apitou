import { toBlob } from "html-to-image";
import { downloadBlob } from "./download";

export const SUPPORTS_SHARE =
  typeof navigator !== "undefined" && typeof navigator.share === "function";

export async function generateImageBlob(
  node: HTMLElement,
): Promise<Blob | null> {
  await document.fonts.ready;

  return toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
}

export async function shareResultImage(
  blob: Blob,
  filename: string,
): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  const canShare = navigator.canShare?.({ files: [file] });

  if (!canShare) {
    downloadBlob(blob, filename);
    return;
  }

  try {
    await navigator.share({ files: [file] });
  } catch (error) {
    if ((error as DOMException)?.name !== "AbortError") throw error;
  }
}
