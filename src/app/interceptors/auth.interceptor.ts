import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { LocalStorageService } from "../services/common/local-storage.service";
import { LocalStorageKeys } from "../constants/locale.storage-keys";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authToken = inject(LocalStorageService).getItem(LocalStorageKeys.accessToken);

  const reqWithAuthHeader = req.clone({
    headers: req.headers.set("Authorization", `Bearer ${authToken}`),
  });

  return next(reqWithAuthHeader);
};
