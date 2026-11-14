import { Component, inject } from '@angular/core';
import { Session } from '../../core/session';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-recursos-academicos',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './recursos-academicos.html',
  styleUrl: './recursos-academicos.css',
})
export class RecursosAcademicos {
  protected readonly session = inject(Session);
  protected get coach(): boolean { return this.session.account()?.role === 'COACH'; }
}
