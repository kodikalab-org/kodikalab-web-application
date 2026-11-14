import { Component } from '@angular/core';
import { TopicsLive } from './topics-live';

/** Pantalla conectada a la API: toda la vista vive en `topics-live`. */
@Component({
  selector: 'app-rendimiento-equipo',
  imports: [TopicsLive],
  template: '<app-topics-live />',
})
export class RendimientoEquipo {}
