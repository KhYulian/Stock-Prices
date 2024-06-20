import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { LocalStorageService } from "../common/local-storage.service";
import { BehaviorSubject, catchError, filter, Observable, retry, switchMap, take, tap, throwError } from "rxjs";
import { WebSocketSubject } from "rxjs/internal/observable/dom/WebSocketSubject";
import { webSocket } from "rxjs/webSocket";
import { LocalStorageKeys } from "../../constants/locale.storage-keys";
import { GetTokenRequest } from "../../types/entity/token/request/get-token.request";
import { GetTokenResponse } from "../../types/entity/token/response/get-token.response";
import { GetInstrumentsResponse } from "../../types/entity/instrument/response/get-instruments.response";
import { GetHistoryDataResponse } from "../../types/entity/history-data/response/get-history-data.response";
import { RealTimeDataItem } from "../../types/entity/real-time-data/real-time-data-item.entity";

@Injectable({
  providedIn: "root",
})
export class FinchartsDataService {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<null | string>(null);
  private accessToken: string | null = null;
  private baseWsUrl = environment.FINCHARTS_WS_URI;

  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService,
  ) {
    this.setTokenFromLocalStorage();
  }

  public getToken() {
    const headers = new HttpHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body: GetTokenRequest = {
      grant_type: "password",
      client_id: "app-cli",
      username: environment.FINCHARTS_USERNAME,
      password: environment.FINCHARTS_PASSWORD,
    };
    const params = new HttpParams()
      .set("grant_type", body.grant_type)
      .set("client_id", body.client_id)
      .set("username", body.username)
      .set("password", body.password);

    return this.http
      .post<GetTokenResponse>(`/api/identity/realms/fintatech/protocol/openid-connect/token`, params.toString(), {
        headers,
      })
      .pipe(
        tap((response) => {
          this.accessToken = response.access_token;
          this.localStorageService.setItem(LocalStorageKeys.accessToken, response.access_token);
        }),
      );
  }

  public getInstrument(symbol: string) {
    const params = new HttpParams().set("symbol", symbol).set("provider", "simulation");
    const headers = this.getAuthorizationHeader();

    return this.http.get<GetInstrumentsResponse>("/api/api/instruments/v1/instruments", { params, headers }).pipe(
      switchMap((response) => {
        return this.processResponse(response);
      }),
      catchError((error) => {
        if (error.status === 401) {
          return this.handle401Error(symbol);
        } else {
          return throwError(error);
        }
      }),
    );
  }

  public gatDateRange(instrumentId: string, startDate: string, endDate: string | null | undefined) {
    const headers = this.getAuthorizationHeader();
    let params = new HttpParams()
      .set("instrumentId", instrumentId)
      .set("startDate", startDate)
      .set("provider", "simulation")
      .set("interval", "1")
      .set("periodicity", "day");
    if (endDate) {
      params = params.set("endDate", endDate);
    }

    return this.http.get<GetHistoryDataResponse>("/api/api/bars/v1/bars/date-range", { params, headers }).pipe(
      retry({
        count: 1,
        delay: (error, retryCount) => {
          if (error.status === 401) {
            return this.getToken().pipe(
              switchMap((token) => {
                const headers = this.getAuthorizationHeader();
                return this.http.get<GetHistoryDataResponse>("/api/api/bars/v1/bars/date-range", { params, headers });
              }),
            );
          }
          throw error;
        },
      }),
    );
  }

  public getWebSocketSubjectForRealTime() {
    return this.createWebSocketSubject(`${this.baseWsUrl}/api/streaming/ws/v1/realtime?token=${this.accessToken}`);
  }

  private createWebSocketSubject = (url: string): WebSocketSubject<RealTimeDataItem> => {
    return webSocket(url);
  };

  private handle401Error(symbol: string) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.getToken().pipe(
        switchMap((token) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token.access_token);
          return this.getInstrumentWithNewToken(symbol, token.access_token);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          return throwError(err);
        }),
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token != null),
        take(1),
        switchMap((token) => this.getInstrumentWithNewToken(symbol, token)),
      );
    }
  }

  private getInstrumentWithNewToken(symbol: string, token: string | null): Observable<any> {
    const params = new HttpParams().set("symbol", symbol);
    const headers = this.getAuthorizationHeader();

    return this.http.get<GetInstrumentsResponse>("/api/api/instruments/v1/instruments", { params, headers }).pipe(
      switchMap((response) => {
        return this.processResponse(response);
      }),
    );
  }

  private processResponse(response: GetInstrumentsResponse): Observable<any> {
    return new Observable((observer) => {
      observer.next(response.data[0]);
      observer.complete();
    });
  }

  private setTokenFromLocalStorage() {
    this.accessToken = this.localStorageService.getItem(LocalStorageKeys.accessToken);
  }

  private getAuthorizationHeader() {
    return new HttpHeaders().set("Authorization", `Bearer ${this.accessToken}`);
  }
}
