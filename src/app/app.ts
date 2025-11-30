import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./components/page/navbar/navbar";
import { Foot } from "./components/page/foot/foot";
import { ConverterComponent } from "./components/converter/converter";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Foot, ConverterComponent,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('tucambio');
}
