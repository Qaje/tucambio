// src/app/services/binance.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface P2PAdvertisement {
  advertiser: {
    nickName: string;
    userNo: string;
  };
  adv: {
    price: string;
    tradableQuantity: string;
    minSingleTransAmount: string;
    maxSingleTransAmount: string;
  };
  tradeMethodNames: string[];
}

export interface P2PResponse {
  data: P2PAdvertisement[];
  total: number;
}

export interface ConversionRate {
  usdtPrice: number;
  bobToUsdRate: number;
  buyPrice: number;    // Precio de COMPRA (cuánto cuesta 1 USDT en BOB)
  sellPrice: number;   // Precio de VENTA (cuánto recibes en BOB por 1 USDT)
  avgPrice: number;    // Precio promedio
  timestamp: Date;
}

export interface ConversionResult {
  exchangeRate: number;
  amountBOB: number;
  amountUSDT: number;
  buyPrice: number;
  sellPrice: number;
  avgPrice: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BinanceService {
  // Para desarrollo con proxy
  private readonly P2P_API = '/bapi/c2c/v2/friendly/c2c/adv/search';
  // Para producción (descomentar y comentar la línea de arriba)
  // private readonly P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

  private cachedRates: ConversionRate | null = null;
  private lastRateUpdate: Date = new Date();

  constructor(private http: HttpClient) {
    this.updateRates();
  }

  /**
   * Obtiene anuncios de compra de USDT (lo que vendedores ofrecen)
   */
  private getBuyAdvertisements(): Observable<P2PAdvertisement[]> {
    const payload = {
      asset: 'USDT',
      fiat: 'BOB',
      merchantCheck: false,
      page: 1,
      rows: 10,
      tradeType: 'BUY',  // Nosotros compramos USDT
      transAmount: ''
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<P2PResponse>(this.P2P_API, payload, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error obteniendo anuncios de compra:', error);
        return [];
      })
    );
  }

  /**
   * Obtiene anuncios de venta de USDT (lo que compradores ofrecen pagar)
   */
  private getSellAdvertisements(): Observable<P2PAdvertisement[]> {
    const payload = {
      asset: 'USDT',
      fiat: 'BOB',
      merchantCheck: false,
      page: 1,
      rows: 10,
      tradeType: 'SELL',  // Nosotros vendemos USDT
      transAmount: ''
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<P2PResponse>(this.P2P_API, payload, { headers }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error obteniendo anuncios de venta:', error);
        return [];
      })
    );
  }

  /**
   * Obtiene las tasas actuales de P2P
   */
  getCurrentRates(): Observable<ConversionRate> {
    return forkJoin({
      buyAds: this.getBuyAdvertisements(),
      sellAds: this.getSellAdvertisements()
    }).pipe(
      map(({ buyAds, sellAds }) => {
        // Precio de compra: el más bajo que encontramos (mejor precio para comprar USDT)
        const buyPrice = buyAds.length > 0
          ? Math.min(...buyAds.map(ad => parseFloat(ad.adv.price)))
          : 7.0;

        // Precio de venta: el más alto que encontramos (mejor precio para vender USDT)
        const sellPrice = sellAds.length > 0
          ? Math.max(...sellAds.map(ad => parseFloat(ad.adv.price)))
          : 6.8;

        const avgPrice = (buyPrice + sellPrice) / 2;

        const rates: ConversionRate = {
          buyPrice,
          sellPrice,
          avgPrice,
          timestamp: new Date(),
          usdtPrice: avgPrice, // Asumiendo que el precio promedio es el precio de USDT en BOB
          bobToUsdRate: 1 / avgPrice // Tasa de conversión BOB a USD (aproximada)
        };

        this.cachedRates = rates;
        this.lastRateUpdate = new Date();

        return rates;
      })
    );
  }

  /**
   * Actualiza las tasas en cache
   */
  updateRates(): void {
    this.getCurrentRates().subscribe({
      next: (rates) => {
        //thisbuyPrice = rates.buyPrice
        console.log('Tasas P2P actualizadas:', rates);
      },
      error: (error) => {
        console.error('Error actualizando tasas:', error);
      }
    });
  }

  /**
   * Obtiene las tasas cacheadas
   */
  getCachedRates(): ConversionRate | null {
    // Actualizar si han pasado más de 30 segundos
    const secondsSinceUpdate = (new Date().getTime() - this.lastRateUpdate.getTime()) / 1000;
    if (secondsSinceUpdate > 30) {
      this.updateRates();
    }
    return this.cachedRates;
  }

  /**
   * Convierte BOB a USDT
   * @param amountBOB - Cantidad en Bolivianos
   * @param useAverage - Si es true usa precio promedio, si es false usa precio de compra
   */
  convertBOBtoUSDT(amountBOB: number, useAverage: boolean = true): Observable<ConversionResult> {
    return this.getCurrentRates().pipe(
      map(rates => {
        // const priceToUse = useAverage ? rates.avgPrice : rates.buyPrice;
        const priceToUse = rates.buyPrice;
        const amountUSDT = amountBOB / priceToUse;

        return {
          exchangeRate: priceToUse,
          amountBOB,
          amountUSDT,
          buyPrice: rates.buyPrice,
          sellPrice: rates.sellPrice,
          avgPrice: rates.avgPrice,
          timestamp: new Date()
        };
      })
    );
  }

  /**
   * Convierte USDT a BOB
   * @param amountUSDT - Cantidad en USDT
   * @param useAverage - Si es true usa precio promedio, si es false usa precio de venta
   */
  convertUSDTtoBOB(amountUSDT: number, useAverage: boolean = true): Observable<ConversionResult> {
    return this.getCurrentRates().pipe(
      map(rates => {
        console.log(rates)
        // const priceToUse = useAverage ? rates.avgPrice : rates.sellPrice;
        const priceToUse = rates.sellPrice;
        const amountBOB = amountUSDT * priceToUse;

        return {
          exchangeRate: priceToUse,
          amountBOB,
          amountUSDT,
          buyPrice: rates.buyPrice,
          sellPrice: rates.sellPrice,
          avgPrice: rates.avgPrice,
          timestamp: new Date()
        };
      })
    );
  }

  /**
   * Obtiene los mejores anuncios actuales (top 5 de cada lado)
   */
  getTopAdvertisements(): Observable<{
    buyAds: P2PAdvertisement[];
    sellAds: P2PAdvertisement[];
  }> {
    return forkJoin({
      buyAds: this.getBuyAdvertisements(),
      sellAds: this.getSellAdvertisements()
    }).pipe(
      map(({ buyAds, sellAds }) => ({
        buyAds: buyAds.slice(0, 5),
        sellAds: sellAds.slice(0, 5)
      }))
    );
  }
}
