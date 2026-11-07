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
import { map, switchMap, tap } from 'rxjs';
import { apiError } from '../../../core/api';
import { CoachGroup, CreateGroupRequest, TeamsApi } from '../../../core/teams-api';

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

  protected readonly estado$;
  protected readonly paso$;
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  /** Borrador que se está continuando (`?borrador=<id>`); `null` al crear un grupo nuevo. */
  protected readonly borradorId = signal<number | null>(null);
  protected readonly cargandoBorrador = signal(false);

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
    const borrador = Number(route.snapshot.queryParamMap.get('borrador'));
    if (Number.isInteger(borrador) && borrador > 0) this.cargarBorrador(borrador);
    this.estado$ = route.queryParamMap.pipe(
      map((params) => params.get('estado') ?? ''),
      tap((estado) => {
        if (
          ['borrador', 'creando', 'perfil-incompleto', 'conexion'].includes(estado) &&
          !this.general.controls.nombre.value &&
          this.general.pristine
        ) {
          this.general.patchValue({
            nombre: 'Entrenamiento de Grafos',
            descripcion:
              'Preparación para competencias ICPC con enfoque en grafos y programación dinámica.',
            nivel: 'Intermedio',
            cupo: 15,
          });
          this.acceso.patchValue({ visibilidad: estado === 'borrador' ? 'Público' : 'Protegido' });
        }
      }),
    );
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

  /** US04: guarda lo ingresado como BORRADOR (solo exige el nombre). */
  protected guardarBorrador(): void {
    this.enviar(true);
  }

  /** US04: publica el grupo, que pasa a estar visible para los practicantes. */
  protected crearGrupo(): void {
    this.enviar(false);
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

  private enviar(draft: boolean): void {
    if (this.guardando()) return;
    this.error.set('');
    this.exito.set('');

    if (!this.general.controls.nombre.value.trim()) {
      this.general.controls.nombre.markAsTouched();
      this.error.set('El nombre del grupo es obligatorio.');
      return;
    }

    if (!draft) {
      if (this.general.invalid || this.horario.invalid || this.acceso.invalid) {
        this.general.markAllAsTouched();
        this.horario.markAllAsTouched();
        this.acceso.markAllAsTouched();
        this.error.set(
          'Revisa los campos marcados: para publicar se exige nombre, nivel y cupo entre 1 y 1000.',
        );
        return;
      }
    }

    const body: CreateGroupRequest = {
      name: this.general.controls.nombre.value.trim(),
      description: this.general.controls.descripcion.value.trim() || null,
      expectedLevel: NIVELES[this.general.controls.nivel.value] ?? this.general.controls.nivel.value,
      maxCapacity: this.general.controls.cupo.value,
      sessionSchedule: this.horarioTexto(),
      visibility: this.acceso.controls.visibilidad.value === 'Público' ? 'PUBLICO' : 'PROTEGIDO',
      draft,
    };

    const borrador = this.borradorId();
    if (borrador !== null) {
      this.actualizarBorrador(borrador, body, draft);
      return;
    }

    this.guardando.set(true);
    this.api.create(body).subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.api.lastCreated.set(response);
        // Borrador y grupo publicado pasan por la confirmación: ahí se muestra el
        // código de invitación y, si quedó como borrador, se puede publicar.
        this.router.navigate(['/coach/grupos/creado']);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.error.set(apiError(error));
      },
    });
  }

  /** US04: carga un borrador del coach (`GET /teams/me`) en el formulario para continuarlo. */
  private cargarBorrador(id: number): void {
    this.cargandoBorrador.set(true);
    this.api.loadMine().subscribe({
      next: (mine) => {
        this.cargandoBorrador.set(false);
        const borrador = mine.find(
          (item): item is CoachGroup =>
            'activeMembers' in item && item.groupId === id && item.status === 'BORRADOR',
        );
        if (!borrador) {
          this.error.set('No encontramos ese borrador. Puede que ya esté publicado o que no sea tuyo.');
          return;
        }
        this.borradorId.set(id);
        this.general.patchValue({
          nombre: borrador.name,
          descripcion: borrador.description ?? '',
          nivel: Object.keys(NIVELES).find((k) => NIVELES[k] === borrador.expectedLevel) ?? '',
          cupo: borrador.maxCapacity,
        });
        this.acceso.patchValue({
          visibilidad: borrador.visibility === 'PROTEGIDO' ? 'Protegido' : 'Público',
        });
        const horario = /^(.+) de (\d{2}:\d{2}) a (\d{2}:\d{2})$/.exec(borrador.sessionSchedule ?? '');
        if (horario) {
          const dias = horario[1].split(', ').filter((dia) => this.dias.includes(dia));
          this.horario.patchValue({ dias, inicio: horario[2], fin: horario[3] });
        }
      },
      error: (error: unknown) => {
        this.cargandoBorrador.set(false);
        this.error.set(apiError(error));
      },
    });
  }

  /** Guarda los cambios del borrador y, si corresponde, lo publica. */
  private actualizarBorrador(id: number, body: CreateGroupRequest, soloBorrador: boolean): void {
    const cambios: Partial<CreateGroupRequest> = { ...body };
    delete cambios.draft;
    this.guardando.set(true);
    const guardado$ = this.api.updateDraft(id, cambios);
    const flujo$ = soloBorrador
      ? guardado$.pipe(map((detalle) => ({ detalle, message: 'Borrador actualizado correctamente.' })))
      : guardado$.pipe(
          switchMap(() => this.api.publish(id)),
          map((detalle) => ({
            detalle,
            message: 'Grupo publicado: ya aparece en el listado y acepta solicitudes.',
          })),
        );
    flujo$.subscribe({
      next: ({ detalle, message }) => {
        this.guardando.set(false);
        this.api.lastCreated.set({
          message,
          groupId: detalle.groupId,
          name: detalle.name,
          status: detalle.status,
          invitationCode: detalle.invitationCode,
        });
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
