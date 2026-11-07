import { Component, input } from '@angular/core';

interface Paso {
  numero: number;
  titulo: string;
  detalle: string;
}

/** Indicator of the three steps of the assignment; steps before `paso` show as completed. */
@Component({
  selector: 'app-pasos-asignacion',
  templateUrl: './pasos-asignacion.html',
  host: { class: 'block' },
})
export class PasosAsignacion {
  /** Current step, from 1 to 3. */
  readonly paso = input.required<1 | 2 | 3>();

  protected readonly pasos: Paso[] = [
    { numero: 1, titulo: 'Seleccionar problemas', detalle: 'Elige del catálogo' },
    { numero: 2, titulo: 'Configurar asignación', detalle: 'Competencia, letras y puntaje' },
    { numero: 3, titulo: 'Revisar y confirmar', detalle: 'Verifica antes de asignar' },
  ];
}
