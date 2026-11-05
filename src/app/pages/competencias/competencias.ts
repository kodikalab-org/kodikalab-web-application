import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, tap, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-competencias',
  imports: [
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  templateUrl: './competencias.html',
  styleUrl: './competencias.css',
})
export class Competencias {
  protected readonly estado$;
  protected readonly accion$;
  protected readonly resultados = [
    { nombre: 'Maratón interna UPC', detalle: '18 oct. 2026 · 5 / 24 equipos' },
    { nombre: 'ICPC Regional 2026', detalle: '31 oct. 2026 · 12 / 80 equipos' },
  ];
  protected readonly form = new FormGroup(
    {
      nombre: new FormControl('ICPC Regional 2026', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)],
      }),
      fecha: new FormControl<Date | null>(new Date(2026, 9, 31), Validators.required),
      puesto: new FormControl<number | null>(12, [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^\d+$/),
      ]),
      total: new FormControl<number | null>(80, [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^\d+$/),
      ]),
      problemas: new FormControl('7 de 12', {
        nonNullable: true,
        validators: (control) => {
          if (!control.value) return null;
          const partes = /^(\d+)\s+de\s+(\d+)$/.exec(control.value.trim());
          return partes && Number(partes[1]) <= Number(partes[2]) && Number(partes[2]) > 0
            ? null
            : { problemas: true };
        },
      }),
      respaldo: new FormControl('https://icpc.global/regionals', {
        nonNullable: true,
        validators: Validators.pattern(/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/),
      }),
    },
    {
      validators: (form) => {
        const { puesto, total } = form.value;
        return puesto != null && total != null && puesto > total ? { puesto: true } : null;
      },
    },
  );

  constructor(route: ActivatedRoute) {
    this.estado$ = route.queryParamMap.pipe(
      map((params) => params.get('estado') ?? ''),
      distinctUntilChanged(),
      tap((estado) => {
        if (estado === 'validacion-pendiente') this.form.controls.puesto.reset(null);
      }),
    );
    this.accion$ = route.queryParamMap.pipe(map((params) => params.get('accion')));
  }
}
