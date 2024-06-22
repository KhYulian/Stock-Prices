import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, ViewChild } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { Router, RouterLink } from "@angular/router";
import { DatePipe, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterParams } from "../../constants/router-params";
import { pathNames } from "../../pathnames";
import { FinchartsDataService } from "../../services/api/finchartsData.service";
import { catchError, finalize, Subscription, tap } from "rxjs";
import { SnackbarService } from "../../services/common/snackbar.service";
import { WebSocketSubject } from "rxjs/internal/observable/dom/WebSocketSubject";
import { NgApexchartsModule } from "ng-apexcharts";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { AppChartComponent } from "../../components/app-chart/app-chart.component";
import { Instrument } from "../../types/entity/instrument/instrument.entity";
import { RealTimeDataItem } from "../../types/entity/real-time-data/real-time-data-item.entity";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    RouterLink,
    NgIf,
    FormsModule,
    DatePipe,
    NgApexchartsModule,
    MatProgressSpinner,
    AppChartComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  @ViewChild(AppChartComponent) appChartComponent!: AppChartComponent;

  protected isLoading = false;
  protected currentInstrument: Instrument | null = null;
  protected subscriptionData: RealTimeDataItem | null = null;
  private webSocketSubject: WebSocketSubject<any> | null = null;
  private webSocketSubscription: Subscription | null = null;
  private currentSubscription: string | null = null;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly finchartsDataService: FinchartsDataService,
    private readonly snackbarService: SnackbarService,
  ) {
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.stopWebSocketConnection();
  }

  protected setCurrentSubscription(symbol: string) {
    if (!symbol || this.currentSubscription === symbol) return;

    if (this.appChartComponent) {
      this.appChartComponent.resetSeries();
    }

    this.stopWebSocketConnection();
    this.currentSubscription = symbol;
    this.cdr.markForCheck();

    this.finchartsDataService
      .getInstrument(symbol)
      .pipe(
        tap((instrument) => {
          if (!instrument) {
            this.snackbarService.openSnackBar("This symbol does not exist!");
            this.stopWebSocketConnection();
          }

          if (!this.webSocketSubject) {
            this.webSocketSubject = this.finchartsDataService.getWebSocketSubjectForRealTime();
          }

          this.webSocketSubscription = this.webSocketSubject.subscribe(
            (msg) => {
              if (msg?.type === "l1-update") {
                this.subscriptionData = msg;
                const updatedSeries = [
                  {
                    name: this.appChartComponent.series[0]?.name ?? "",
                    data: [
                      ...this.appChartComponent.series[0].data,
                      [new Date(msg.last.timestamp).getTime(), msg.last.price],
                    ],
                  },
                ];

                // @ts-ignore
                this.series = updatedSeries;
                // @ts-ignore
                this.appChartComponent.setChartSeries(updatedSeries);
              }

              this.cdr.markForCheck();
            },
            (err) => console.error("WebSocket error:", err),
            () => {
              this.snackbarService.openSnackBar("An error occurred, please start subscription again.");
              this.webSocketSubject = null;
            },
          );

          this.sendSubscriptionMessageToWebSocket(instrument);
          this.currentInstrument = instrument;
        }),
        catchError((error) => {
          this.currentInstrument = null;
          return error;
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe();
  }

  protected navigateToHistoricalData() {
    if (!this.currentSubscription) return;

    const historicalDataPathname = pathNames.historicalPrices.replace(
      `:${RouterParams.InstrumentID}`,
      this.currentSubscription,
    );

    this.router.navigate([historicalDataPathname], {
      queryParams: { [RouterParams.InstrumentID]: this.currentInstrument?.id },
    });
  }

  private sendSubscriptionMessageToWebSocket(instrument: Instrument) {
    const message = {
      type: "l1-subscription",
      id: "1",
      instrumentId: instrument.id,
      provider: "simulation",
      subscribe: true,
      kinds: ["last"],
    };
    this.webSocketSubject?.next(message);
  }

  private stopWebSocketConnection = () => {
    if (this.webSocketSubscription) {
      this.webSocketSubscription.unsubscribe();
      this.webSocketSubscription = null;
    }
    if (this.webSocketSubject) {
      this.webSocketSubject.complete();
      this.webSocketSubject = null;
    }
  };
}
