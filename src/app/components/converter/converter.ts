// src/app/components/converter/converter.component.ts
import { Component, OnInit } from '@angular/core';
import { BinanceService,ConversionResult } from '../../services/binance-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-converter',
  templateUrl: './converter.html',
  styleUrls: ['./converter.css'],
  standalone:true,
  imports:[CommonModule,FormsModule]
})
export class ConverterComponent implements OnInit {
  amountBOB: number = 0;
  amountUSDT: number = 0;

  currentRate: number = 0;
  usdtPrice: number = 0;
  bobToUsdRate: number = 0;

  buyPrice: number = 0;
  sellPrice: number = 0;
  avgPrice: number = 0;

  loading: boolean = false;
  lastUpdate: Date | null = null;

  // Para controlar qué campo se está editando
  editingBOB: boolean = true;

  constructor(private binanceService: BinanceService) {}

  ngOnInit(): void {
    this.loadCurrentRates();
    // Actualizar tasas cada 30 segundos
    //setInterval(() => this.loadCurrentRates(), 30000);
  }

  /**
   * Carga las tasas actuales
   */
  loadCurrentRates(): void {
    this.binanceService.getCurrentRates().subscribe({
      next: (rates) => {
        console.log("rates 1", rates  )
        this.buyPrice = rates.buyPrice
        this.bobToUsdRate = rates.bobToUsdRate;
        this.usdtPrice = rates.usdtPrice;
        this.sellPrice = rates.sellPrice;
        this.avgPrice = rates.avgPrice;
        this.currentRate = rates.bobToUsdRate * rates.usdtPrice;
        this.lastUpdate = rates.timestamp;
      },
      error: (error) => {
        console.error('Error cargando tasas:', error);
      }
    });
  }

  /**
   * Convierte de BOB a USDT
   */
  onBOBChange(): void {
    if (this.amountBOB < 0) {
      this.amountBOB = 0;
      return;
    }

    this.editingBOB = true;

    if (this.amountBOB === 0) {
      this.amountUSDT = 0;
      return;
    }

    //this.loading = true;
    this.binanceService.convertBOBtoUSDT(this.amountBOB).subscribe({
      next: (result: ConversionResult) => {
        this.amountUSDT = parseFloat(result.amountUSDT.toFixed(2));
        this.currentRate = result.exchangeRate;
        // this.buyPrice = result.avgPrice;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en conversión:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Convierte de USDT a BOB
   */
  onUSDTChange(): void {
    if (this.amountUSDT < 0) {
      this.amountUSDT = 0;
      return;
    }

    this.editingBOB = false;

    if (this.amountUSDT === 0) {
      this.amountBOB = 0;
      return;
    }

    //this.loading = true;
    this.binanceService.convertUSDTtoBOB(this.amountUSDT).subscribe({
      next: (result: ConversionResult) => {
        this.amountBOB = parseFloat(result.amountBOB.toFixed(2));
        this.currentRate = result.exchangeRate;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en conversión:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Intercambia los valores
   */
  swapValues(): void {
    const temp = this.amountBOB;
    this.amountBOB = this.amountUSDT;
    this.amountUSDT = temp;

    if (this.editingBOB) {
      this.onBOBChange();
    } else {
      this.onUSDTChange();
    }
  }

  /**
   * Limpia los campos
   */
  clearFields(): void {
    this.amountBOB = 0;
    this.amountUSDT = 0;
  }

  /**
   * Actualiza manualmente las tasas
   */
  refreshRates(): void {
    //this.loading = true;
    this.binanceService.updateRates();
    this.loadCurrentRates();

    setTimeout(() => {
      this.loading = false;
      if (this.amountBOB > 0) {
        this.onBOBChange();
      }
    }, 1000);
  }
}
