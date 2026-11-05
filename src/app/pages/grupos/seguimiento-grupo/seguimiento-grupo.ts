import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { map } from 'rxjs';

@Component({
  selector: 'app-seguimiento-grupo',
  imports: [
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './seguimiento-grupo.html',
  styleUrl: './seguimiento-grupo.css',
})
export class SeguimientoGrupo {
  protected readonly guardado$;
  protected readonly form = new FormGroup({
    observacion: new FormControl('Confirma si puedes asistir los jueves de 19:00 a 21:00.', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });
  constructor(route: ActivatedRoute) {
    this.guardado$ = route.queryParamMap.pipe(map((params) => params.get('vista') === 'guardado'));
  }
}
