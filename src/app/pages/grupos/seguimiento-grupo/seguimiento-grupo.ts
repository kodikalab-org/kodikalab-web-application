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
  protected readonly error$;
  protected readonly errores = {
    'sin-vigencia': {
      titulo: 'La solicitud ya no está vigente',
      detalle:
        'Camila Rojas retiró la postulación. No se puede aceptar ni rechazar y no se modificó la membresía.',
      estado: 'Retirada · Sin vigencia',
    },
    'sin-vacantes': {
      titulo: 'El grupo no tiene vacantes',
      detalle:
        'Equipo Alfa llegó a su capacidad antes de confirmar la aceptación. La postulación permanece pendiente; Camila no fue incorporada.',
      estado: 'Pendiente · Sin vacantes',
    },
    'sin-autorizacion': {
      titulo: 'No tienes permiso para procesar esta solicitud',
      detalle:
        'Tu cuenta no figura como coach responsable del Equipo Alfa. No se aplicó ninguna decisión ni se cambió la membresía.',
      estado: 'Pendiente · Sin decisión',
    },
  };
  protected readonly guardado$;
  protected readonly form = new FormGroup({
    observacion: new FormControl('Confirma si puedes asistir los jueves de 19:00 a 21:00.', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });
  constructor(route: ActivatedRoute) {
    this.error$ = route.queryParamMap.pipe(
      map((params) => {
        const estado = params.get('vista');
        return estado === 'sin-vigencia' ||
          estado === 'sin-vacantes' ||
          estado === 'sin-autorizacion'
          ? this.errores[estado]
          : null;
      }),
    );
    this.guardado$ = route.queryParamMap.pipe(map((params) => params.get('vista') === 'guardado'));
  }
}
