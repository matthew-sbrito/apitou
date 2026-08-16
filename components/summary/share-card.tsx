"use client";

import { Button } from "@/components/ui/button";
import type { EventStandingRow } from "@/types/database";
import { Download, Share2 } from "lucide-react";
import { useRef, useState } from "react";

import { downloadBlob } from "@/lib/download";
import { generateImageBlob, shareResultImage } from "@/lib/export-result";

export function ShareCard({
  eventName,
  standings,
  topScorerName,
  topScorerGoals,
  longestReignTeam,
  longestReignCount,
}: {
  eventName: string;
  standings: EventStandingRow[];
  topScorerName: string | null;
  topScorerGoals: number;
  longestReignTeam: string | null;
  longestReignCount: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function downloadResult() {
    if (!cardRef.current) return;

    setExporting(true);

    try {
      const image = await generateImageBlob(cardRef.current);

      if (!image) return;

      const filename = `${eventName.replace(/\s+/g, "-").toLowerCase()}-sumula.png`;
      downloadBlob(image, filename);
    } finally {
      setExporting(false);
    }
  }

  async function shareResult() {
    if (!cardRef.current) return;

    setExporting(true);

    try {
      const image = await generateImageBlob(cardRef.current);

      if (!image) return;

      const filename = `${eventName.replace(/\s+/g, "-").toLowerCase()}-sumula.png`;
      await shareResultImage(image, filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={cardRef}
        className="flex flex-col gap-4 rounded-2xl bg-apito-black p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-apito-yellow">
            Apitou
          </p>
          <h3 className="text-xl font-black text-apito-white">{eventName}</h3>
        </div>

        {standings.slice(0, 3).length > 0 && (
          <ol className="flex flex-col gap-1">
            {standings.slice(0, 3).map((row, i) => (
              <li
                key={row.team_id}
                className="flex items-center justify-between text-sm text-apito-white"
              >
                <span>
                  {i + 1}º {row.team_name}
                </span>
                <span className="font-bold text-apito-yellow">
                  {row.points} pts
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-col gap-1 border-t border-white/10 pt-3 text-sm text-apito-white">
          {topScorerName && (
            <p>
              🥇 Artilheiro:{" "}
              <span className="font-semibold">{topScorerName}</span> (
              {topScorerGoals})
            </p>
          )}
          {longestReignTeam && longestReignCount > 0 && (
            <p>
              👑 Maior reinado:{" "}
              <span className="font-semibold">{longestReignTeam}</span> (
              {longestReignCount})
            </p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={exporting}
        onClick={downloadResult}
      >
        <Download className="h-4 w-4" />
        {exporting ? "Gerando..." : "Baixar resultado"}
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={exporting}
        onClick={shareResult}
      >
        <Share2 className="h-4 w-4" />
        {exporting ? "Gerando..." : "Compartilhar no zap"}
      </Button>
    </div>
  );
}
