import type { GrowStage, IrrigationPhase, RoomKind, SteeringStrategy } from "./types";

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

export function kindLabel(k: RoomKind) {
  return ({
    standard: "Standard",
    phenohunt: "Pheno Hunt",
    cropsteering: "Crop Steering",
  } as const)[k];
}

export function kindColor(k: RoomKind) {
  return ({
    standard: "text-muted border-line bg-panel2",
    phenohunt: "text-info border-info/30 bg-info/10",
    cropsteering: "text-cream border-cream/30 bg-cream/10",
  } as const)[k];
}

export function phaseLabel(p: IrrigationPhase) {
  return ({
    P0: "Nacht-Dryback",
    P1: "Ramp Up",
    P2: "Maintenance",
    P3: "End of Day",
  } as const)[p];
}

export function phaseColor(p: IrrigationPhase) {
  return ({
    P0: "text-info border-info/30 bg-info/10",
    P1: "text-warn border-warn/30 bg-warn/10",
    P2: "text-leaf border-leaf/30 bg-leaf/10",
    P3: "text-cream border-cream/30 bg-cream/10",
  } as const)[p];
}

export function strategyLabel(s: SteeringStrategy) {
  return ({
    vegetative: "Vegetativ",
    generative: "Generativ",
    transition: "Transition",
  } as const)[s];
}

export function strategyDescription(s: SteeringStrategy) {
  return ({
    vegetative:
      "Viele kleine Shots, geringer Dryback (5–15 %). Fördert Blattmasse & Streckung.",
    generative:
      "Wenige große Shots, hoher Dryback (20–35 %). Fördert Blütenbildung & Dichte.",
    transition:
      "Mittlerer Dryback (10–20 %). Übergang von vegetativ zu generativ.",
  } as const)[s];
}
