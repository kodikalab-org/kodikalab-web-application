import { Component } from '@angular/core';
import { ProgressLive } from './progress-live';

/** Pantalla conectada a la API: toda la vista vive en `progress-live`. */
@Component({
  selector: 'app-progreso-equipos',
  imports: [ProgressLive],
  template: '<app-progress-live />',
})
export class ProgresoEquipos {}
