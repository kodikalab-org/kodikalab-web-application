import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderNavigation } from '../../../shared/header-navigation/header-navigation';
import { UserMenu } from '../../../shared/user-menu/user-menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { SiteFooter } from '../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-plataformas-competitivas',
  imports: [SiteFooter, HeaderNavigation, UserMenu, AsyncPipe, RouterLink, MatButtonModule, MatToolbarModule],
  templateUrl: './plataformas-competitivas.html',
  styleUrl: './plataformas-competitivas.css',
})
export class PlataformasCompetitivas {
  protected readonly plataformas = [
    {
      nombre: 'Codeforces',
      usuario: 'camila_rc',
      pendiente: true,
    },
  ];

  /** Estado de maqueta (`?estado=confirmada`): Codeforces validó el identificador. */
  protected readonly estado$ = inject(ActivatedRoute).queryParamMap.pipe(
    map((params) => params.get('estado')),
  );
}
