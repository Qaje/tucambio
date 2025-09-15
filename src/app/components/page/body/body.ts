import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinanceService, ExchangeRates } from '../../../services/binance-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-body',
  imports: [CommonModule],
  templateUrl: './body.html',
  styleUrl: './body.css',
})
export class Body implements OnInit, OnDestroy {
  public usdtAmount: number = 0;
  public bolivianoAmount: number = 0;
  public exchangeRates: ExchangeRates | null = null;

  // Variables para manejar los inputs
  public usdtDisplayValue: string = '';
  public bobDisplayValue: string = '';
  public isFocusedUsdt: boolean = false;
  public isFocusedBob: boolean = false;

  // Control de qué input se está editando
  public editingUsdt: boolean = false;
  public editingBob: boolean = false;

  private ratesSubscription?: Subscription;

  constructor(private binanceService: BinanceService) {}

  ngOnInit(): void {
    // Suscribirse a las actualizaciones de tasas de cambio
    this.ratesSubscription = this.binanceService.exchangeRates$.subscribe((rates) => {
      this.exchangeRates = rates;
      console.log('Nuevas tasas de cambio recibidas:', rates);

      // Solo actualizar automáticamente si no se está editando ningún campo
      if (!this.editingUsdt && !this.editingBob) {
        this.updateDisplayValues();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.ratesSubscription) {
      this.ratesSubscription.unsubscribe();
    }
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  swapCurrencies(): void {
    if (!this.exchangeRates) return;

    // Intercambiar valores
    const tempUsdt = this.usdtAmount;
    this.usdtAmount = this.binanceService.convertBobToUsdt(
      this.bolivianoAmount,
      this.exchangeRates
    );
    this.bolivianoAmount = this.binanceService.convertUsdtToBob(tempUsdt, this.exchangeRates);

    this.updateDisplayValues();
  }

  private updateDisplayValues(): void {
    this.usdtDisplayValue = this.usdtAmount === 0 ? '' : this.usdtAmount.toString();
    this.bobDisplayValue = this.bolivianoAmount === 0 ? '' : this.bolivianoAmount.toString();
  }

  // ===== EVENTOS PARA INPUT USDT =====

  onUsdtInput(event: any): void {
    this.editingUsdt = true;
    let value = this.processInputValue(event);

    this.usdtDisplayValue = value;
    this.usdtAmount = parseFloat(value) || 0;

    // Convertir a bolivianos automáticamente
    if (this.exchangeRates) {
      this.bolivianoAmount = this.binanceService.convertUsdtToBob(
        this.usdtAmount,
        this.exchangeRates
      );
      if (!this.isFocusedBob) {
        this.bobDisplayValue = this.bolivianoAmount === 0 ? '' : this.bolivianoAmount.toString();
      }
    }
  }

  onUsdtFocus(event: any): void {
    this.isFocusedUsdt = true;
    this.editingUsdt = true;
    if (this.usdtAmount === 0 && this.usdtDisplayValue === '') {
      this.usdtDisplayValue = '';
    } else {
      this.usdtDisplayValue = this.usdtAmount.toString();
    }
  }

  onUsdtBlur(event: any): void {
    this.isFocusedUsdt = false;
    this.editingUsdt = false;

    let value = event.target.value;
    if (value === '' || value === '0') {
      this.usdtAmount = 0;
      this.usdtDisplayValue = '';
      this.bolivianoAmount = 0;
      this.bobDisplayValue = '';
      return;
    }
  }

  // ===== EVENTOS PARA INPUT BOLIVIANOS =====

  onBobInput(event: any): void {
    this.editingBob = true;
    let value = this.processInputValue(event);

    this.bobDisplayValue = value;
    this.bolivianoAmount = parseFloat(value) || 0;

    // Convertir a USDT automáticamente
    if (this.exchangeRates) {
      this.usdtAmount = this.binanceService.convertBobToUsdt(
        this.bolivianoAmount,
        this.exchangeRates
      );
      if (!this.isFocusedUsdt) {
        this.usdtDisplayValue = this.usdtAmount === 0 ? '' : this.usdtAmount.toString();
      }
    }
  }

  onBobFocus(event: any): void {
    this.isFocusedBob = true;
    this.editingBob = true;
    if (this.bolivianoAmount === 0 && this.bobDisplayValue === '') {
      this.bobDisplayValue = '';
    } else {
      this.bobDisplayValue = this.bolivianoAmount.toString();
    }
  }

  onBobBlur(event: any): void {
    this.isFocusedBob = false;
    this.editingBob = false;

    let value = event.target.value;
    if (value === '' || value === '0') {
      this.bolivianoAmount = 0;
      this.bobDisplayValue = '';
      this.usdtAmount = 0;
      this.usdtDisplayValue = '';
      return;
    }
  }

  // ===== FUNCIONES AUXILIARES =====

  private processInputValue(event: any): string {
    let value = event.target.value;

    // Solo permitir números, punto y coma
    value = value.replace(/[^0-9.,]/g, '');

    // Reemplazar coma por punto
    value = value.replace(/,/g, '.');

    // Controlar múltiples puntos
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limitar decimales a 2 mientras se escribe
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    // Actualizar el input sin mover el cursor
    if (event.target.value !== value) {
      const cursorPosition = event.target.selectionStart;
      event.target.value = value;
      event.target.setSelectionRange(cursorPosition, cursorPosition);
    }

    return value;
  }

  onKeyPress(event: KeyboardEvent): boolean {
    const input = event.target as HTMLInputElement;
    const key = event.key;
    const currentValue = input.value;

    // Permitir teclas de control
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ].includes(key)
    ) {
      return true;
    }

    // Permitir números
    if (key >= '0' && key <= '9') {
      return true;
    }

    // Permitir punto o coma solo si no existe ya
    if (
      (key === '.' || key === ',') &&
      !currentValue.includes('.') &&
      !currentValue.includes(',')
    ) {
      return true;
    }

    // Bloquear todo lo demás
    event.preventDefault();
    return false;
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = (event.clipboardData || (window as any).clipboardData).getData('text');
    const input = event.target as HTMLInputElement;

    // Procesar el texto pegado
    let value = paste.replace(/[^0-9.,]/g, '');
    value = value.replace(',', '.');

    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('').substring(0, 2);
    } else if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    input.value = value;

    // Determinar qué input se está editando y actualizar correspondientemente
    if (input.classList.contains('usdt-input')) {
      this.usdtAmount = parseFloat(value) || 0;
      if (this.exchangeRates) {
        this.bolivianoAmount = this.binanceService.convertUsdtToBob(
          this.usdtAmount,
          this.exchangeRates
        );
      }
    } else {
      this.bolivianoAmount = parseFloat(value) || 0;
      if (this.exchangeRates) {
        this.usdtAmount = this.binanceService.convertBobToUsdt(
          this.bolivianoAmount,
          this.exchangeRates
        );
      }
    }
  }

  // ===== MÉTODOS PARA EL TEMPLATE =====

  getCurrentUsdtRate(): string {
    return this.exchangeRates ? this.exchangeRates.usdtToUsd.toFixed(4) : 'Cargando...';
  }

  getLastUpdated(): string {
    if (!this.exchangeRates) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - this.exchangeRates.lastUpdated.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  refreshRates(): void {
    this.binanceService.refreshRates();
  }

  testConversion(): void {
    console.log('=== TEST DE CONVERSIÓN ===');
    console.log('Exchange Rates:', this.exchangeRates);
    console.log('USDT Amount:', this.usdtAmount);
    console.log('Boliviano Amount:', this.bolivianoAmount);

    if (this.exchangeRates) {
      const testBob = 100;
      const testUsdt = this.binanceService.convertBobToUsdt(testBob, this.exchangeRates);
      const backToBob = this.binanceService.convertUsdtToBob(testUsdt, this.exchangeRates);

      console.log(`100 BOB = ${testUsdt.toFixed(6)} USDT`);
      console.log(`${testUsdt.toFixed(6)} USDT = ${backToBob.toFixed(2)} BOB`);
    }
  }
}


