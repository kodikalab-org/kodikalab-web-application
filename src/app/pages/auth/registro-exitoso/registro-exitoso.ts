import { Component, OnDestroy, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Clipboard } from '@angular/cdk/clipboard';
import { Session } from '../../../core/session';

@Component({
  selector: 'app-registro-exitoso',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatToolbarModule,
  ],
  templateUrl: './registro-exitoso.html',
  styleUrl: './registro-exitoso.css',
})
export class RegistroExitoso implements OnDestroy {
  protected readonly estado$;
  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(map((params) => params.get('estado')));
  }
  private readonly session = inject(Session);
  private readonly clipboard = inject(Clipboard);
  protected readonly registration = this.session.registration();
  protected readonly form = new FormGroup({
    saved: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });
  protected copyStatus = '';
  protected copiar(): void {
    const code = this.registration?.recoveryCode;
    this.copyStatus =
      code && this.clipboard.copy(code)
        ? 'Código copiado'
        : 'No se pudo copiar. Selecciona el código y cópialo manualmente.';
  }
  ngOnDestroy(): void {
    this.session.registration.set(null);
  }
}
