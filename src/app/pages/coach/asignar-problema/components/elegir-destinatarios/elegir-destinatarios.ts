import { Component } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

/** Si se eligen integrantes concretos, debe haber al menos uno marcado. */
function algunIntegrante(grupo: AbstractControl): ValidationErrors | null {
  const tipo = grupo.get('tipo')?.value;
  const marcados = (grupo.get('integrantes')?.value ?? []) as boolean[];
  return tipo === 'algunos' && !marcados.some(Boolean) ? { sinIntegrantes: true } : null;
}

@Component({
  selector: 'app-elegir-destinatarios',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './elegir-destinatarios.html',
  styleUrl: './elegir-destinatarios.css',
  host: { class: 'block' },
})
export class ElegirDestinatarios {
  // Integrantes de ejemplo: los dos últimos no son elegibles (no pertenecen al equipo activo).
  protected readonly integrantes = [
    { nombre: 'Valeria Núñez', detalle: 'Intermedio', motivo: '', claseMotivo: '', elegible: true },
    { nombre: 'Sebastián Cruz', detalle: 'Principiante', motivo: '', claseMotivo: '', elegible: true },
    { nombre: 'Ítalo Mendoza', detalle: 'Avanzado', motivo: '', claseMotivo: '', elegible: true },
    { nombre: 'Camila Rojas', detalle: 'Intermedio', motivo: '', claseMotivo: '', elegible: true },
    { nombre: 'Diego Paredes', detalle: 'Principiante', motivo: '', claseMotivo: '', elegible: true },
    { nombre: 'Lucía Vega', detalle: 'Intermedio', motivo: '', claseMotivo: '', elegible: true },
    {
      nombre: 'Mateo Quispe',
      detalle: 'Intermedio',
      motivo: 'Solicitud pendiente',
      claseMotivo: 'border-amber-400/50 bg-amber-400/10 text-amber-300',
      elegible: false,
    },
    {
      nombre: 'Ana Torres',
      detalle: 'Avanzado',
      motivo: 'Retiró su membresía',
      claseMotivo: 'border-kl-border-strong bg-white/4 text-kl-body',
      elegible: false,
    },
  ];

  /** Público: la pantalla de configuración lo usa para habilitar «Continuar». */
  readonly form = new FormGroup(
    {
      tipo: new FormControl('equipo', { nonNullable: true, validators: [Validators.required] }),
      busqueda: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
      integrantes: new FormArray(
        this.integrantes.map(
          (m) => new FormControl({ value: m.elegible, disabled: !m.elegible }, { nonNullable: true }),
        ),
      ),
    },
    { validators: [algunIntegrante] },
  );
}
