import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { LocalStorageService } from "../common/local-storage.service";
import { map, retry, switchMap, tap } from "rxjs";
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
  constructor(
    private readonly http: HttpClient,
    private readonly localStorageService: LocalStorageService,
  ) {}

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
          this.localStorageService.setItem(LocalStorageKeys.accessToken, response.access_token);
        }),
      );
  }

  public getInstrument(symbol: string) {
    const params = new HttpParams().set("symbol", symbol).set("provider", "simulation");
    const requestUrl = `/api/api/instruments/v1/instruments`;

    const requestObservable$ = this.http.get<GetInstrumentsResponse>(requestUrl, { params }).pipe(
      map((response) => {
        return response.data[0];
      }),
    );

    return requestObservable$.pipe(
      retry({
        delay: (error) => {
          if (error.status !== 401) throw error;

          return this.getToken().pipe(
            switchMap(() => {
              return requestObservable$;
            }),
          );
        },
      }),
    );
  }

  public gatDateRange(instrumentId: string, startDate: string, endDate: string | null | undefined) {
    let params = new HttpParams()
      .set("instrumentId", instrumentId)
      .set("startDate", startDate)
      .set("provider", "simulation")
      .set("interval", "1")
      .set("periodicity", "day");
    if (endDate) {
      params = params.set("endDate", endDate);
    }
    const requestUrl = "/api/api/bars/v1/bars/date-range";

    return this.http.get<GetHistoryDataResponse>(requestUrl, { params }).pipe(
      retry({
        count: 1,
        delay: (error) => {
          if (error.status !== 401) throw error;

          return this.getToken().pipe(
            switchMap(() => {
              return this.http.get<GetHistoryDataResponse>(requestUrl, { params });
            }),
          );
        },
      }),
    );
  }

  public getWebSocketSubjectForRealTime() {
    const accessToken = this.localStorageService.getItem(LocalStorageKeys.accessToken);
    return this.createWebSocketSubject(
      `${environment.FINCHARTS_WS_URI}/api/streaming/ws/v1/realtime?token=${accessToken}`,
    );
  }

  private createWebSocketSubject = (url: string): WebSocketSubject<RealTimeDataItem> => {
    return webSocket(url);
  };
}
