import type { GrowStage } from "./types";

export function stageLabel(s: GrowStage) {
  return ({
    seedling: "Keimling",
    vegetative: "Wachstum",
    flowering: "Blüte",
    drying: "Trocknung",
  } as const)[s];
}

export function stageColor(s: GrowStage) {
  return ({
    seedling: "text-info border-info/30 bg-info/10",
    vegetative: "text-leaf border-leaf/30 bg-leaf/10",
    flowering: "text-warn border-warn/30 bg-warn/10",
    drying: "text-muted border-line bg-panel2",
  } as const)[s];
}
