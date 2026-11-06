import { Component, afterNextRender, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Session } from './core/session';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);
  constructor() {
    this.viewportScroller.setOffset([0, 96]);
    afterNextRender(() => this.session.restore());
  }
  protected readonly title = signal('kodikalab_application');
}
