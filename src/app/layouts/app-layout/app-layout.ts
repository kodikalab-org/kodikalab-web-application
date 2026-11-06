import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-app-layout',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
  host: { class: 'block' },
})
export class AppLayout {
  // Solo "Problemas" tiene destino por ahora; el resto de enlaces del Figma aún no existe.
  protected readonly enlaces = ['Concursos', 'Grupos', 'Recursos'];

  protected readonly form = new FormGroup({
    busqueda: new FormControl('', { nonNullable: true }),
  });
}
