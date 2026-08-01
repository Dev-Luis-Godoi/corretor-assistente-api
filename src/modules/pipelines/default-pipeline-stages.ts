export interface DefaultPipelineStage {
  name: string;
  position: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

const defaultPipelineStages = [
  { name: "Novo lead", position: 0, color: "#3B82F6", isWon: false, isLost: false },
  { name: "Primeiro contato", position: 1, color: "#06B6D4", isWon: false, isLost: false },
  { name: "Visita", position: 2, color: "#F59E0B", isWon: false, isLost: false },
  { name: "Negociação", position: 3, color: "#8B5CF6", isWon: false, isLost: false },
  { name: "Fechado", position: 4, color: "#22C55E", isWon: true, isLost: false },
  { name: "Perdido", position: 5, color: "#EF4444", isWon: false, isLost: true },
] satisfies DefaultPipelineStage[];

export function getDefaultPipelineStages(): DefaultPipelineStage[] {
  return defaultPipelineStages.map((stage) => ({ ...stage }));
}
