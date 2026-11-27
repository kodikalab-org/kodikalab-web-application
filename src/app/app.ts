import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Session } from './core/session';
import { AgentPanel } from './shared/agent-panel/agent-panel';

@Component({
  imports: [AgentPanel, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly session = inject(Session);
  protected readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);
  /** True while the router is resolving a screen, including its lazy chunk. */
  protected readonly navigating = computed(() => this.router.currentNavigation() !== null);
  constructor() {
    this.viewportScroller.setOffset([0, 96]);
    afterNextRender(() => this.session.restore());
  }
  protected readonly title = signal('kodikalab_application');
}
