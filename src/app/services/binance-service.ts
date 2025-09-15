import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

export interface ExchangeRates {
  usdtToUsd: number;
  usdToBob: number;
  usdtToBob: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root',
})
export class BinanceService {
  private readonly BINANCE_API_BASE = 'https://api.binance.com/api/v3';
  private readonly USD_TO_BOB_RATE = 6.96; // Tasa fija USD a BOB (puedes actualizarla desde otra API)

  private exchangeRatesSubject = new BehaviorSubject<ExchangeRates>({
    usdtToUsd: 1,
    usdToBob: this.USD_TO_BOB_RATE,
    usdtToBob: this.USD_TO_BOB_RATE,
    lastUpdated: new Date(),
  });

  public exchangeRates$ = this.exchangeRatesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startRealTimeUpdates();
  }

  /**
   * Obtiene el precio actual de USDT/USD desde Binance
   */
  getUSDTPrice(): Observable<number> {
    return this.http
      .get<BinanceTickerResponse>(`${this.BINANCE_API_BASE}/ticker/price?symbol=USDCUSDT`)
      .pipe(
        map((response) => parseFloat(response.price)),
        catchError((error) => {
          console.error('Error fetching USDT price:', error);
          return of(1); // Valor por defecto si falla
        })
      );
  }

  /**
   * Obtiene múltiples precios de una vez
   */
  getMultiplePrices(symbols: string[]): Observable<BinanceTickerResponse[]> {
    const symbolsParam = symbols.map((s) => `"${s}"`).join(',');
    return this.http
      .get<BinanceTickerResponse[]>(
        `${this.BINANCE_API_BASE}/ticker/price?symbols=[${symbolsParam}]`
      )
      .pipe(
        catchError((error) => {
          console.error('Error fetching multiple prices:', error);
          return of([]);
        })
      );
  }

  /**
   * Actualiza las tasas de cambio
   */
  private updateExchangeRates(): void {
    // Obtener USDT/USD desde Binance
    this.getUSDTPrice().subscribe((usdtToUsd) => {
      const rates: ExchangeRates = {
        usdtToUsd: usdtToUsd,
        usdToBob: this.USD_TO_BOB_RATE,
        usdtToBob: usdtToUsd * this.USD_TO_BOB_RATE,
        lastUpdated: new Date(),
      };

      this.exchangeRatesSubject.next(rates);
    });
  }

  /**
   * Inicia actualizaciones en tiempo real cada 30 segundos
   */
  private startRealTimeUpdates(): void {
    // Actualización inicial
    this.updateExchangeRates();

    // Actualizaciones cada 30 segundos
    interval(30000)
      .pipe(switchMap(() => this.getUSDTPrice()))
      .subscribe((usdtToUsd) => {
        const rates: ExchangeRates = {
          usdtToUsd: usdtToUsd,
          usdToBob: this.USD_TO_BOB_RATE,
          usdtToBob: usdtToUsd * this.USD_TO_BOB_RATE,
          lastUpdated: new Date(),
        };

        this.exchangeRatesSubject.next(rates);
      });
  }

  /**
   * Convierte BOB a USDT
   */
  convertBobToUsdt(bobAmount: number, rates: ExchangeRates): number {
    return bobAmount / rates.usdtToBob;
  }

  /**
   * Convierte USDT a BOB
   */
  convertUsdtToBob(usdtAmount: number, rates: ExchangeRates): number {
    return usdtAmount * rates.usdtToBob;
  }

  /**
   * Obtiene las tasas actuales de forma síncrona
   */
  getCurrentRates(): ExchangeRates {
    return this.exchangeRatesSubject.getValue();
  }

  /**
   * Fuerza una actualización manual de las tasas
   */
  refreshRates(): void {
    this.updateExchangeRates();
  }
}
