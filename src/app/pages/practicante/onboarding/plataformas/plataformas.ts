import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap } from 'rxjs';

const usuarioExterno = () =>
  new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]*$/)],
  });

@Component({
  selector: 'app-onboarding-plataformas',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './plataformas.html',
  styleUrl: './plataformas.css',
})
export class OnboardingPlataformas {
  protected readonly plataformas = [
    { clave: 'codeforces', nombre: 'Codeforces', icono: 'images/onboarding/codeforces-34.svg' },
    { clave: 'atcoder', nombre: 'AtCoder', icono: 'images/onboarding/atcoder-34.svg' },
    { clave: 'vjudge', nombre: 'VJudge', icono: 'images/onboarding/vjudge-34.svg' },
  ];

  protected readonly form = new FormGroup({
    codeforces: usuarioExterno(),
    atcoder: usuarioExterno(),
    vjudge: usuarioExterno(),
  });

  /**
   * Estados de maqueta (`?estado=`): `error-formato` precarga un usuario de
   * Codeforces inválido y `guardando` precarga los tres usuarios y muestra el
   * botón en curso de guardado.
   */
  private readonly route = inject(ActivatedRoute);
  protected readonly estado$ = this.route.queryParamMap.pipe(
    map((params) => params.get('estado')),
    tap((estado) => this.aplicarEstado(estado)),
  );

  private aplicarEstado(estado: string | null): void {
    this.form.reset();
    if (estado === 'error-formato') {
      this.form.patchValue({ codeforces: 'camila rojas!', atcoder: 'camila_r' });
      this.form.markAllAsTouched();
    }
    if (estado === 'guardando') {
      this.form.patchValue({ codeforces: 'camila_cf', atcoder: 'camila_r', vjudge: 'camila_vj' });
    }
  }
}
