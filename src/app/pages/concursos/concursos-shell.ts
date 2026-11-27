import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from '../../shared/app-header/app-header';
import { SiteFooter } from '../../shared/site-footer/site-footer';

/** Frame of the practitioner contest pages: shared header, Kodikalab backdrop and footer. */
@Component({
  selector: 'app-concursos-shell',
  imports: [AppHeader, RouterOutlet, SiteFooter],
  template: `<div class="kl-page-bg relative isolate flex min-h-dvh flex-col overflow-clip bg-kl-bg font-body text-kl-text">
    <app-header [coach]="false" />
    <main class="flex flex-1 flex-col"><router-outlet /></main>
    <app-site-footer audience="practicante" />
  </div>`,
  host: { class: 'block' },
})
export class ConcursosShell {}
