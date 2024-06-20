export interface Mapping {
  symbol: string;
  exchange: string;
}

export interface Instrument {
  id: string;
  symbol: string;
  kind: string;
  exchange: string;
  description: string;
  tickSize: number;
  currency: string;
  baseCurrency: string;
  mappings: Record<string, Mapping>;
}
