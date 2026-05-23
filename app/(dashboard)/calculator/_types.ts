/** Запись истории расчётов металла (localStorage). */
export interface HistoryEntry {
  id: string;
  ts: number;
  materialLabel: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
  pricePerTon: number;
  markupType: "percent" | "fixed";
  markupValue: number;
  massPerSheet: number;
  totalMass: number;
  cost: number;
  costWithMarkup: number;
}

/** Режим работы калькулятора металла. */
export type CalcMode = "quick" | "counterparty";
