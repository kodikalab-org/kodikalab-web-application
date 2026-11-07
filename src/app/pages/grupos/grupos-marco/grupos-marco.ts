import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from '../../../shared/app-header/app-header';
import { SiteFooter } from '../../../shared/site-footer/site-footer';
import { Session } from '../../../core/session';

@Component({
  selector: 'app-grupos-marco',
  imports: [SiteFooter, AppHeader, RouterOutlet],
  templateUrl: './grupos-marco.html',
  styleUrl: './grupos-marco.css',
})
export class GruposMarco {
  private readonly session = inject(Session);

  constructor() {
    this.session.restore();
  }

  /** The role comes from the session, so this page serves both coaches and practitioners. */
  protected get coach(): boolean {
    const role = this.session.demo() ?? this.session.account()?.role;
    return role === 'COACH';
  }
}
