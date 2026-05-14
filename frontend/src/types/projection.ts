export interface ReturnAssumptions {
  bank: number;       // e.g. 0.015
  cpf_oa: number;     // 0.025
  cpf_sa: number;     // 0.04
  cpfis: number;      // 0.05
  retirement: number; // 0.07
  equity: number;     // 0.07
  crypto: number;     // 0.0
  metals: number;     // 0.02
}

export interface Scenario {
  id: string;
  name: string;
  monthlyIncome: number;
  monthlySurplus: number;
  targetNetworth: number;
  targetDate: string | null; // YYYY-MM-DD or null
  returnAssumptions: ReturnAssumptions;
}

export interface ProjectionPoint {
  month: number; // months from now
  networth: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  targetReachedMonth: number | null;
  requiredSurplus: number | null; // for backward projection
}
