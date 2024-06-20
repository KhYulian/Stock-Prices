import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { RouterParams } from "../../constants/router-params";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatButton } from "@angular/material/button";
import { FinchartsDataService } from "../../services/api/finchartsData.service";
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable,
} from "@angular/material/table";
import { DatePipe, NgIf } from "@angular/common";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { FormsModule } from "@angular/forms";
import { catchError, EMPTY, finalize, tap } from "rxjs";
import { SnackbarService } from "../../services/common/snackbar.service";
import { HistoryDataItem } from "../../types/entity/history-data/history-data-item.entity";

enum HistoricalDataTableColumns {
  Date = "Date",
  Open = "Open",
  High = "High",
  Low = "Low",
  Close = "Close",
  Volume = "Volume",
}

@Component({
  selector: "app-historical-prices",
  standalone: true,
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButton,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatCell,
    MatHeaderCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    NgIf,
    MatNoDataRow,
    MatProgressSpinner,
    FormsModule,
    DatePipe,
  ],
  templateUrl: "./historical-prices.component.html",
  styleUrl: "./historical-prices.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricalPricesComponent implements OnInit {
  protected dataSource: HistoryDataItem[] = [];
  protected columnNames = HistoricalDataTableColumns;
  protected columnsToDisplay = Object.values(HistoricalDataTableColumns);
  protected startDate: Date | null = null;
  protected endDate: Date | null = null;
  protected isLoading = false;
  private instrumentId: string | null = null;

  protected get currentSymbol() {
    return this.route.snapshot.params[RouterParams.InstrumentID];
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly datePipe: DatePipe,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackbarService: SnackbarService,
    private readonly finchartsDataService: FinchartsDataService,
  ) {}

  ngOnInit() {
    this.instrumentId = this.route.snapshot.queryParams[RouterParams.InstrumentID];
  }

  protected onSearch(): void {
    if (!this.instrumentId || !this.startDate) return;

    const dateFormat = "yyyy-MM-dd";
    const transformedStartDate = this.datePipe.transform(this.startDate, dateFormat)!;
    const transformedEndDate = this.datePipe.transform(this.endDate, dateFormat);

    this.isLoading = true;

    this.finchartsDataService
      .gatDateRange(this.instrumentId, transformedStartDate, transformedEndDate)
      .pipe(
        tap((result) => {
          this.dataSource = result.data ?? [];
        }),
        catchError((error) => {
          this.snackbarService.openSnackBar(`An error occurred! ${error?.error?.message}`);
          this.dataSource = [];
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe();
  }

  protected goBack() {
    this.router.navigate([".."]);
  }
}
