import { Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-registro-problemas-resueltos',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './registro-problemas-resueltos.html',
  styleUrl: './registro-problemas-resueltos.css',
  host: { class: 'block' },
})
export class RegistroProblemasResueltos {
  /** El contenedor (diálogo) cierra el formulario cuando se emite. */
  readonly cancelar = output<void>();

  protected readonly lenguajes = ['Python 3.11', 'C++17', 'Java 17', 'JavaScript (Node 20)', 'Kotlin'];

  protected readonly form = new FormGroup({
    metodo: new FormControl('codigo', { nonNullable: true }),
    lenguaje: new FormControl('Python 3.11', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    codigo: new FormControl(
      'n = int(input())\nseq = [n]\nwhile n != 1:\n    n = n // 2 if n % 2 == 0 else 3 * n + 1\n    seq.append(n)\nprint(*seq)',
      { nonNullable: true, validators: [Validators.required] },
    ),
    evidencia: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500), Validators.pattern(/^(https?:\/\/\S+)?$/)],
    }),
  });
}
