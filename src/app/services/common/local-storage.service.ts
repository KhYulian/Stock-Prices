import { Injectable } from "@angular/core";
import { LocalStorageKeys } from "../../constants/locale.storage-keys";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  public setItem(key: LocalStorageKeys, value: string): void {
    localStorage.setItem(key, value);
  }

  public getItem(key: LocalStorageKeys): string | null {
    return localStorage.getItem(key);
  }

  public removeItem(key: LocalStorageKeys): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }
}
