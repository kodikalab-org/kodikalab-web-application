import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from '../../shared/app-header/app-header';
import { SiteFooter } from '../../shared/site-footer/site-footer';

/** Frame of the practitioner contest pages: shared header, Kodikalab backdrop and footer. */
@Component({
  selector: 'app-concursos-shell',
  imports: [AppHeader, RouterOutlet, SiteFooter],
  template: `<div class="relative isolate flex min-h-dvh flex-col overflow-clip bg-kl-bg font-body text-kl-text">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[url('/images/progreso-ranking/fondo.svg')] bg-size-[1440px_900px] bg-position-[right_top] bg-no-repeat [mask-image:linear-gradient(to_bottom,black_80%,transparent)] lg:bg-size-[100%_900px]"
    ></div>
    <app-header [coach]="false" />
    <main class="flex flex-1 flex-col"><router-outlet /></main>
    <app-site-footer audience="practicante" />
  </div>`,
  host: { class: 'block' },
})
export class ConcursosShell {}
