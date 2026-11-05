import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, tap } from 'rxjs';
import { PERFIL_COACH_DEMO } from '../../../data/perfil-coach-demo';

const MAX_ANIOS = 60;
const MAX_PRESENTACION = 500;

@Component({
  selector: 'app-coach-perfil-editar',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './perfil-editar.html',
  styleUrl: './perfil-editar.css',
})
export class CoachPerfilEditar {
  private readonly ruta = inject(ActivatedRoute);

  protected readonly perfil = PERFIL_COACH_DEMO;
  protected readonly enlaces = ['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos'];
  protected readonly maxPresentacion = MAX_PRESENTACION;

  protected readonly form = new FormGroup({
    especialidad: new FormControl(PERFIL_COACH_DEMO.especialidad, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    organizacion: new FormControl(PERFIL_COACH_DEMO.organizacion, {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    anios: new FormControl<number | null>(PERFIL_COACH_DEMO.anios, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_ANIOS),
    ]),
    presentacion: new FormControl(PERFIL_COACH_DEMO.presentacion, {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_PRESENTACION)],
    }),
  });

  /** Aviso "No pudimos guardar tus cambios": se muestra tras un intento fallido de guardar. */
  protected mostrarAviso = false;

  /** `?estado=errores` abre el formulario con la especialidad vacía y 75 años, como en el Figma. */
  protected readonly vista$ = this.ruta.queryParamMap.pipe(
    map((params) => ({ errores: params.get('estado') === 'errores' })),
    tap(({ errores }) => this.aplicarEstado(errores)),
  );

  protected cambiarAnios(paso: number): void {
    const anios = this.form.controls.anios;
    anios.setValue(Math.min(MAX_ANIOS, Math.max(0, (anios.value ?? 0) + paso)));
    anios.markAsTouched();
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarAviso = true;
    }
  }

  private aplicarEstado(errores: boolean): void {
    if (errores) {
      this.form.patchValue({ especialidad: '', anios: 75 });
      this.form.markAllAsTouched();
    }
    this.mostrarAviso = errores;
  }
}
