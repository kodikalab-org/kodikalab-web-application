import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { map } from 'rxjs';
import { apiError } from '../../../core/api';
import { CreateGroupRequest, TeamsApi } from '../../../core/teams-api';

const NIVELES: Record<string, string> = {
  Principiante: 'PRINCIPIANTE',
  Intermedio: 'INTERMEDIO',
  Avanzado: 'AVANZADO',
};

@Component({
  selector: 'app-crear-grupo',
  imports: [
    AsyncPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
  ],
  templateUrl: './crear-grupo.html',
  styleUrl: './crear-grupo.css',
})
export class CrearGrupo {
  private readonly api = inject(TeamsApi);
  private readonly router = inject(Router);

  protected readonly paso$;
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly pasos = ['Información general', 'Horario', 'Acceso y visibilidad', 'Resumen'];
  protected readonly ayudas = [
    'Datos básicos del grupo',
    'Configura las sesiones',
    'Controla quién puede unirse',
    'Revisa y crea el grupo',
  ];
  protected readonly dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  protected readonly general = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)],
    }),
    descripcion: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    nivel: new FormControl('', { nonNullable: true, validators: Validators.required }),
    cupo: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(1000),
      Validators.pattern(/^\d+$/),
    ]),
  });
  protected readonly horario = new FormGroup(
    {
      dias: new FormControl<string[]>(['Mar', 'Jue'], {
        nonNullable: true,
        validators: Validators.required,
      }),
      inicio: new FormControl('19:00', { nonNullable: true, validators: Validators.required }),
      fin: new FormControl('21:00', { nonNullable: true, validators: Validators.required }),
    },
    {
      validators: (form) =>
        form.get('inicio')?.value < form.get('fin')?.value ? null : { orden: true },
    },
  );
  protected readonly acceso = new FormGroup({
    visibilidad: new FormControl('Público', { nonNullable: true, validators: Validators.required }),
  });

  constructor(private readonly route: ActivatedRoute) {
    this.paso$ = route.queryParamMap.pipe(
      map((params) => {
        const paso = params.get('paso');
        return paso === '2' ? 2 : paso === '3' ? 3 : paso === '4' ? 4 : 1;
      }),
    );
  }

  protected ajustarCupo(cambio: number): void {
    const control = this.general.controls.cupo;
    control.setValue(Math.min(1000, Math.max(1, (control.value ?? 0) + cambio)));
    control.markAsTouched();
  }

  /** US04: publica el grupo, que pasa a estar visible para los practicantes. */
  protected crearGrupo(): void {
    this.enviar();
  }

  protected continuar(paso: number): void {
    if (paso >= 4) {
      this.crearGrupo();
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { paso: paso + 1 },
      queryParamsHandling: 'merge',
    });
  }

  protected irAtras(paso: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { paso },
      queryParamsHandling: 'merge',
    });
  }

  private enviar(): void {
    if (this.guardando()) return;
    this.error.set('');

    if (this.general.invalid || this.horario.invalid || this.acceso.invalid) {
      this.general.markAllAsTouched();
      this.horario.markAllAsTouched();
      this.acceso.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de crear el grupo.');
      return;
    }

    const body: CreateGroupRequest = {
      name: this.general.controls.nombre.value.trim(),
      description: this.general.controls.descripcion.value.trim() || null,
      expectedLevel: NIVELES[this.general.controls.nivel.value] ?? this.general.controls.nivel.value,
      maxCapacity: this.general.controls.cupo.value,
      sessionSchedule: this.horarioTexto(),
      visibility: this.acceso.controls.visibilidad.value === 'Público' ? 'PUBLICO' : 'PROTEGIDO',
    };

    this.guardando.set(true);
    this.api.create(body).subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.api.lastCreated.set(response);
        this.router.navigate(['/coach/grupos/creado']);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(apiError(error));
      },
    });
  }

  private horarioTexto(): string | null {
    const { dias, inicio, fin } = this.horario.getRawValue();
    if (!dias.length) return null;
    return `${dias.join(', ')} de ${inicio} a ${fin}`;
  }
}
