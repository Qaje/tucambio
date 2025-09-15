import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./components/page/navbar/navbar";
import { Body } from "./components/page/body/body";
import { Foot } from "./components/page/foot/foot";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Body, Foot],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('tucambio');
}
