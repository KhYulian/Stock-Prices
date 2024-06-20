import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, ViewChild } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { Router, RouterLink } from "@angular/router";
import { DatePipe, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterParams } from "../../constants/router-params";
import { pathNames } from "../../pathnames";
import { FinchartsDataService, Instrument, RealTimeResponse } from "../../services/api/finchartsData.service";
import { catchError, finalize, Subscription, tap } from "rxjs";
import { SnackbarService } from "../../services/common/snackbar.service";
import { WebSocketSubject } from "rxjs/internal/observable/dom/WebSocketSubject";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexFill,
  ApexMarkers,
  ApexYAxis,
  ApexXAxis,
  NgApexchartsModule,
  ChartComponent,
} from "ng-apexcharts";
import { MatProgressSpinner } from "@angular/material/progress-spinner";

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
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  @ViewChild("chartComponent") chartComponent!: ChartComponent;

  public series!: ApexAxisChartSeries;
  public chart!: ApexChart;
  public dataLabels!: ApexDataLabels;
  public markers!: ApexMarkers;
  public title!: ApexTitleSubtitle;
  public fill!: ApexFill;
  public yaxis!: ApexYAxis;
  public xaxis!: ApexXAxis;
  protected currentSubscription: string | null = null;
  protected currentInstrument: Instrument | null = null;
  protected isLoading = false;
  protected subscriptionData: RealTimeResponse | null = null;
  private webSocketSubject: WebSocketSubject<any> | null = null;
  private webSocketSubscription: Subscription | null = null;

  protected get isChartCanBeShown() {
    return (
      this.series &&
      this.chart &&
      this.dataLabels &&
      this.markers &&
      this.title &&
      this.fill &&
      this.xaxis &&
      this.yaxis
    );
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly finchartsDataService: FinchartsDataService,
    private readonly snackbarService: SnackbarService,
  ) {
    this.initChartData();
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.stopWebSocketConnection();
  }

  public initChartData(): void {
    let dates: any[] = [];

    this.series = [
      {
        name: "",
        data: dates as any,
      },
    ];
    this.chart = {
      type: "area",
      stacked: false,
      height: 350,
      animations: {
        enabled: false,
      },
    };
    this.dataLabels = {
      enabled: false,
    };
    this.markers = {
      size: 0,
    };
    this.title = {
      text: "Stock Price Movement",
      align: "left",
    };
    this.fill = {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    };
    this.yaxis = {
      title: {
        text: "Price",
      },
    };
    this.xaxis = {
      type: "datetime",

      labels: {
        format: "yyyy-d-M:HH:mm:ss",
      },
    };
  }

  protected setCurrentSubscription(symbol: string) {
    if (this.currentSubscription === symbol) return;

    this.currentSubscription = symbol;
    this.series = [
      {
        name: "",
        data: [],
      },
    ];
    this.stopWebSocketConnection();
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
              this.subscriptionData = msg;

              if (msg.type === "l1-update") {
                const updatedSeries = [
                  {
                    name: this.series[0]?.name ?? "",
                    data: [...this.series[0].data, [new Date(msg.last.timestamp).getTime(), msg.last.price]],
                  },
                ];

                // @ts-ignore
                this.series = updatedSeries;
                this.chartComponent.updateSeries([
                  {
                    name: this.currentSubscription ?? "",
                    // @ts-ignore
                    data: updatedSeries,
                  },
                ]);
              }
              this.cdr.markForCheck();
            },
            (err) => console.error("WebSocket error:", err),
            () => {
              this.snackbarService.openSnackBar("An error occurred, please start subscription again.");
              this.webSocketSubject = null;
            },
          );

          const message = {
            type: "l1-subscription",
            id: "1",
            instrumentId: instrument.id,
            provider: "simulation",
            subscribe: true,
            kinds: ["last"],
          };
          this.webSocketSubject.next(message);

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
