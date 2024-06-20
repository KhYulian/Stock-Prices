import { RouterParams } from "./constants/router-params";

export const HISTORICAL_PRICES_PREFIX = "historical-prices";

export const pathNames = {
  historicalPrices: `${HISTORICAL_PRICES_PREFIX}/:${RouterParams.InstrumentID}`,
};
