import { Component } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ElegirDestinatarios } from '../elegir-destinatarios/elegir-destinatarios';

@Component({
  selector: 'app-configurar-asignacion',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    ElegirDestinatarios,
  ],
  templateUrl: './configurar-asignacion.html',
  styleUrl: './configurar-asignacion.css',
  host: { class: 'block' },
})
export class ConfigurarAsignacion {
  protected readonly pasos = [
    {
      numero: 1,
      titulo: 'Seleccionar problemas',
      detalle: 'Elige del catálogo',
      hecho: true,
      actual: false,
      clase: 'border-kl-border bg-white/3',
      claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white',
    },
    {
      numero: 2,
      titulo: 'Configurar asignación',
      detalle: 'Competencia, letras y puntaje',
      hecho: false,
      actual: true,
      clase: 'border-[#8a6cff] bg-[#241a5c]/60',
      claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white',
    },
    {
      numero: 3,
      titulo: 'Revisar y confirmar',
      detalle: 'Verifica antes de asignar',
      hecho: false,
      actual: false,
      clase: 'border-kl-border bg-white/3',
      claseNumero: 'bg-white/8 text-kl-muted',
    },
  ];

  // Datos de ejemplo del Figma.
  protected readonly competencias = [
    {
      valor: 'simulacro',
      nombre: 'Simulacro semanal',
      estado: 'Programada',
      claseEstado: 'border-indigo-300/50 bg-indigo-400/10 text-indigo-200',
      detalle: 'Sáb 1 nov · 7:00 p. m. · 5 h · Penalización ICPC 20 min',
      clase: 'border-[#8a6cff] bg-[#241a5c]/60',
    },
    {
      valor: 'maraton',
      nombre: 'Maratón interna UPC',
      estado: 'En curso',
      claseEstado: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300',
      detalle: 'Termina dom 2 nov · 11:59 p. m. · 24 h',
      clase: 'border-kl-border bg-white/3',
    },
    {
      valor: 'practica',
      nombre: 'Contest de práctica',
      estado: 'Finalizada',
      claseEstado: 'border-kl-border-strong bg-white/4 text-kl-muted',
      detalle: 'Finalizó el 12 oct. · No admite nuevos problemas',
      clase: 'border-kl-border bg-white/3 opacity-50',
    },
  ];

  protected readonly filas = [
    { titulo: 'Theatre Square', detalle: 'CF-1A · Codeforces', color: '#FF0000' },
    { titulo: 'Weird Algorithm', detalle: 'CSES-1068 · CSES', color: '#22C55E' },
    { titulo: 'Shortest Routes I', detalle: 'CSES-1671 · CSES', color: '#3B82F6' },
    { titulo: 'I Hate Non-integer Number', detalle: 'ABC262-D · AtCoder', color: '#FACC15' },
  ];

  protected readonly form = new FormGroup({
    competencia: new FormControl('simulacro', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    problemas: new FormArray(
      this.filas.map(
        (fila, i) =>
          new FormGroup({
            letra: new FormControl('CDEF'[i], {
              nonNullable: true,
              validators: [Validators.pattern(/^[A-Z]{1,5}$/)],
            }),
            puntaje: new FormControl<number | null>(100, [Validators.required, Validators.min(1)]),
            color: new FormControl(fila.color, {
              nonNullable: true,
              validators: [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
            }),
          }),
      ),
    ),
  });
}
