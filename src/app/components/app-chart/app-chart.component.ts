import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild } from "@angular/core";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexMarkers,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
  NgApexchartsModule,
} from "ng-apexcharts";
import { NgIf } from "@angular/common";

@Component({
  selector: "app-chart",
  standalone: true,
  imports: [NgApexchartsModule, NgIf],
  templateUrl: "./app-chart.component.html",
  styleUrl: "./app-chart.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppChartComponent {
  @ViewChild("chartComponent") chartComponent!: ChartComponent;

  public series!: ApexAxisChartSeries;
  public chart!: ApexChart;
  public dataLabels!: ApexDataLabels;
  public markers!: ApexMarkers;
  public title!: ApexTitleSubtitle;
  public fill!: ApexFill;
  public yaxis!: ApexYAxis;
  public xaxis!: ApexXAxis;

  public setChartSeries(newSeries: ApexAxisChartSeries) {
    this.series = newSeries;
    this.chartComponent.updateSeries(newSeries);
    this.cdr.markForCheck();
  }

  public resetSeries() {
    this.series = this.getDefaultSeriesState();
    this.cdr.markForCheck();
  }

  constructor(private readonly cdr: ChangeDetectorRef) {
    this.initChartData();
  }

  private initChartData(): void {
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
        format: "HH:mm:ss",
      },
    };
  }

  private getDefaultSeriesState() {
    return [
      {
        name: "",
        data: [],
      },
    ];
  }
}
