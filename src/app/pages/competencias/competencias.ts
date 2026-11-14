import { Component } from '@angular/core';
import { ResultsLive } from './results-live';

/** Pantalla conectada a la API: toda la vista vive en `results-live`. */
@Component({
  selector: 'app-competencias',
  imports: [ResultsLive],
  template: '<app-results-live />',
})
export class Competencias {}
