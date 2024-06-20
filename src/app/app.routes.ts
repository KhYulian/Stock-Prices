import { Routes } from "@angular/router";
import { pathNames } from "./pathnames";

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () => import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: pathNames.historicalPrices,
    loadComponent: () =>
      import("./pages/historical-prices/historical-prices.component").then((m) => m.HistoricalPricesComponent),
  },
  {
    path: "**",
    loadComponent: () => import("./pages/not-found/not-found.component").then((m) => m.NotFoundComponent),
  },
];
