"use client";

import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useState } from "react";

import { downloadBlob } from "@/lib/download";
import { generateImageBlob, shareResultImage } from "@/lib/export-result";

export function ShareButtons({
  eventName,
  elementRefId,
}: {
  eventName: string;
  elementRefId: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function downloadResult() {
    const element = document.getElementById(elementRefId);

    if (!element) return;

    setExporting(true);

    try {
      const image = await generateImageBlob(element);

      if (!image) return;

      const filename = `${eventName.replace(/\s+/g, "-").toLowerCase()}-sumula.png`;
      downloadBlob(image, filename);
    } finally {
      setExporting(false);
    }
  }

  async function shareResult() {
    const element = document.getElementById(elementRefId);

    if (!element) return;

    setExporting(true);

    try {
      const image = await generateImageBlob(element);

      if (!image) return;

      const filename = `${eventName.replace(/\s+/g, "-").toLowerCase()}-sumula.png`;
      await shareResultImage(image, filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={exporting}
        onClick={downloadResult}
      >
        <Download className="h-4 w-4" />
        {/* {exporting ? "Gerando..." : "Baixar resultado"} */}
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={exporting}
        onClick={shareResult}
      >
        <Share2 className="h-4 w-4" />
        {/* {exporting ? "Gerando..." : "Compartilhar no zap"} */}
      </Button>
    </div>
  );
}
