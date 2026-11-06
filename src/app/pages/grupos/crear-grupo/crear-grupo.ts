import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { apiError } from '../../../core/api';
import { CreateGroupRequest, TeamsApi, httpStatus, readFieldErrors } from '../../../core/teams-api';
import {
  CUPO_MAX,
  CUPO_MIN,
  DESCRIPCION_MAX,
  DIAS,
  HORARIO_MAX,
  NIVELES,
  NOMBRE_MAX,
  VISIBILIDADES,
  entero,
  horarioValido,
  maximoSinEspacios,
  requeridoSinEspacios,
  textoHorario,
  unoDe,
} from './crear-grupo-reglas';

/** Textos de error por tipo de validación; el servidor aporta el suyo con la clave `server`. */
const MENSAJES = {
  nombre: {
    required: 'Ingresa el nombre del grupo.',
    maxlength: `El nombre no debe superar ${NOMBRE_MAX} caracteres.`,
  },
  descripcion: { maxlength: `La descripción no debe superar ${DESCRIPCION_MAX} caracteres.` },
  nivel: {
    required: 'Selecciona un nivel objetivo.',
    opcion: 'Selecciona uno de los niveles de la lista.',
  },
  cupo: {
    required: 'Ingresa el cupo máximo.',
    entero: 'El cupo debe ser un número entero.',
    min: `El cupo mínimo es ${CUPO_MIN}.`,
    max: `El cupo máximo es ${CUPO_MAX}.`,
  },
  dias: { required: 'Selecciona al menos un día.' },
  inicio: { required: 'Selecciona la hora de inicio.' },
  fin: { required: 'Selecciona la hora de fin.' },
  visibilidad: {
    required: 'Selecciona la visibilidad del grupo.',
    opcion: 'Selecciona público o protegido.',
  },
} as const;

type Paso = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-crear-grupo',
  imports: [
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

  protected readonly paso = signal<Paso>(1);
  /** Paso más lejano al que llegó el usuario: los anteriores ya se consideran visitados. */
  protected readonly pasoMaximo = signal<Paso>(1);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  /** El backend respondió 403: la cuenta no es coach o falta su perfil de coach. */
  protected readonly sinPermiso = signal(false);

  protected readonly pasos = ['Información general', 'Horario', 'Acceso y visibilidad', 'Resumen'];
  protected readonly ayudas = [
    'Datos básicos del grupo',
    'Configura las sesiones',
    'Controla quién puede unirse',
    'Revisa y crea el grupo',
  ];
  protected readonly dias = DIAS;
  protected readonly niveles = NIVELES;
  protected readonly visibilidades = VISIBILIDADES;
  protected readonly nombreMax = NOMBRE_MAX;
  protected readonly descripcionMax = DESCRIPCION_MAX;
  protected readonly horarioMax = HORARIO_MAX;
  protected readonly cupoMin = CUPO_MIN;
  protected readonly cupoMax = CUPO_MAX;
  protected readonly mensajes = MENSAJES;

  /**
   * Errores devueltos por el backend, por campo. Viven fuera de los controles porque Angular
   * recalcula la validez al montar cada paso y borraría un `setErrors` manual.
   */
  private readonly erroresServidor = new Map<string, string>();

  protected readonly general = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [requeridoSinEspacios(), maximoSinEspacios(NOMBRE_MAX), this.servidor('name')],
    }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [maximoSinEspacios(DESCRIPCION_MAX), this.servidor('description')],
    }),
    nivel: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        unoDe(NIVELES.map((nivel) => nivel.valor)),
        this.servidor('expectedLevel'),
      ],
    }),
    cupo: new FormControl<number | null>(null, [
      Validators.required,
      entero(),
      Validators.min(CUPO_MIN),
      Validators.max(CUPO_MAX),
      this.servidor('maxCapacity'),
    ]),
  });
  protected readonly horario = new FormGroup(
    {
      dias: new FormControl<string[]>([], {
        nonNullable: true,
        validators: Validators.required,
      }),
      inicio: new FormControl('', { nonNullable: true, validators: Validators.required }),
      fin: new FormControl('', { nonNullable: true, validators: Validators.required }),
    },
    { validators: [horarioValido, this.servidor('sessionSchedule')] },
  );
  protected readonly acceso = new FormGroup({
    visibilidad: new FormControl('PUBLICO', {
      nonNullable: true,
      validators: [
        Validators.required,
        unoDe(VISIBILIDADES.map((tipo) => tipo.valor)),
        this.servidor('visibility'),
      ],
    }),
  });

  constructor() {
    const destinos = this.destinosDeErrores();
    for (const [campo, { control }] of Object.entries(destinos)) {
      // Al editar el campo, el error del servidor deja de valer.
      control.valueChanges.subscribe(() => {
        if (this.erroresServidor.delete(campo)) control.updateValueAndValidity({ emitEvent: false });
      });
    }
  }

  private servidor(campo: string): ValidatorFn {
    return () => {
      const mensaje = this.erroresServidor.get(campo);
      return mensaje ? { server: mensaje } : null;
    };
  }

  private destinosDeErrores(): Record<string, { control: AbstractControl; paso: Paso }> {
    return {
      name: { control: this.general.controls.nombre, paso: 1 },
      description: { control: this.general.controls.descripcion, paso: 1 },
      expectedLevel: { control: this.general.controls.nivel, paso: 1 },
      maxCapacity: { control: this.general.controls.cupo, paso: 1 },
      sessionSchedule: { control: this.horario, paso: 2 },
      visibility: { control: this.acceso.controls.visibilidad, paso: 3 },
    };
  }

  /** Mensaje del primer error del control, o cadena vacía si no hay ninguno. */
  protected mensaje(control: AbstractControl, textos: Readonly<Record<string, string>>): string {
    const errores = control.errors;
    if (!errores) return '';
    if (typeof errores['server'] === 'string') return errores['server'];
    const clave = Object.keys(textos).find((tipo) => tipo in errores);
    return clave ? textos[clave] : 'Revisa este campo.';
  }

  protected mensajeHorario(): string {
    const errores = this.horario.errors;
    if (!errores) return '';
    if (typeof errores['server'] === 'string') return errores['server'];
    if (errores['orden']) return 'La hora de fin debe ser posterior a la hora de inicio.';
    if (errores['longitud']) return `El horario no puede superar ${HORARIO_MAX} caracteres.`;
    return '';
  }

  protected nombreNivel(valor: string): string {
    return NIVELES.find((nivel) => nivel.valor === valor)?.etiqueta ?? '';
  }

  protected etiquetaVisibilidad(): string {
    const valor = this.acceso.controls.visibilidad.value;
    return VISIBILIDADES.find((tipo) => tipo.valor === valor)?.etiqueta ?? '';
  }

  /** Horario tal como se enviará, o `null` mientras falten días u horas. */
  protected horarioTexto(): string | null {
    const { dias, inicio, fin } = this.horario.getRawValue();
    return dias.length && inicio && fin ? textoHorario(dias, inicio, fin) : null;
  }

  protected ajustarCupo(cambio: number): void {
    const control = this.general.controls.cupo;
    control.setValue(Math.min(CUPO_MAX, Math.max(CUPO_MIN, (control.value ?? 0) + cambio)));
    control.markAsTouched();
  }

  protected readonly camposHora = ['inicio', 'fin'] as const;

  /** Datos que se mostrarán en el resumen antes de crear el grupo. */
  protected resumen(): { paso: number; filas: readonly (readonly [string, string])[] }[] {
    const datos = this.general.getRawValue();
    return [
      {
        paso: 1,
        filas: [
          ['Nombre', datos.nombre.trim()],
          ['Descripción', datos.descripcion.trim() || 'Sin descripción'],
          ['Nivel objetivo', this.nombreNivel(datos.nivel)],
          ['Cupo máximo', `${datos.cupo} integrantes`],
        ],
      },
      { paso: 2, filas: [['Días y horas', this.horarioTexto() ?? '—']] },
      {
        paso: 3,
        filas: [
          ['Visibilidad', this.etiquetaVisibilidad()],
          ['Estado al crear', 'Activo'],
          ['Código de invitación', 'Se genera al crear'],
        ],
      },
    ];
  }

  protected formularioDelPaso(paso: number): FormGroup | null {
    return paso === 1 ? this.general : paso === 2 ? this.horario : paso === 3 ? this.acceso : null;
  }

  protected pasoValido(paso: number): boolean {
    const formulario = this.formularioDelPaso(paso);
    return formulario ? formulario.valid : this.todoValido();
  }

  /** Un paso se marca con error si tiene campos inválidos y ya se visitó o se tocó. */
  protected pasoConError(paso: number): boolean {
    const formulario = this.formularioDelPaso(paso);
    if (!formulario || formulario.valid) return false;
    return paso < this.pasoMaximo() || paso < this.paso() || formulario.touched;
  }

  protected continuar(): void {
    if (this.guardando()) return;
    const actual = this.paso();
    if (actual === 4) {
      this.crearGrupo();
      return;
    }
    const formulario = this.formularioDelPaso(actual);
    formulario?.markAllAsTouched();
    if (formulario?.invalid) return;
    this.irAPaso((actual + 1) as Paso);
  }

  protected irAtras(): void {
    if (this.paso() > 1) this.irAPaso((this.paso() - 1) as Paso);
  }

  /** Solo se puede volver a un paso ya visitado: avanzar exige completar el actual. */
  protected editarPaso(paso: number): void {
    if (paso >= 1 && paso <= this.pasoMaximo()) this.irAPaso(paso as Paso);
  }

  protected crearGrupo(): void {
    if (this.guardando()) return;
    this.error.set('');
    this.sinPermiso.set(false);

    if (!this.todoValido()) {
      this.marcarTodo();
      this.irAPaso(this.primerPasoInvalido());
      this.error.set('Revisa los campos marcados antes de crear el grupo.');
      return;
    }

    const body: CreateGroupRequest = {
      name: this.general.controls.nombre.value.trim(),
      description: this.general.controls.descripcion.value.trim() || null,
      expectedLevel: this.general.controls.nivel.value,
      maxCapacity: this.general.controls.cupo.value,
      sessionSchedule: this.horarioTexto(),
      visibility: this.acceso.controls.visibilidad.value as 'PUBLICO' | 'PROTEGIDO',
    };

    this.guardando.set(true);
    this.api.create(body).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/coach/grupos/creado']);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.manejarError(error);
      },
    });
  }

  private manejarError(error: unknown): void {
    if (httpStatus(error) === 403) {
      this.sinPermiso.set(true);
      return;
    }
    const sinUbicar = this.aplicarErroresDeCampo(readFieldErrors(error));
    if (sinUbicar === null) {
      this.error.set(apiError(error));
    } else {
      this.error.set(
        ['Corrige los campos marcados; lo que ingresaste se conserva.', ...sinUbicar].join(' '),
      );
    }
  }

  /**
   * Muestra bajo cada control el error que devolvió el backend y vuelve al primer paso afectado.
   * Devuelve los mensajes que no corresponden a ningún campo, o `null` si no había errores.
   */
  private aplicarErroresDeCampo(errores: Record<string, string>): string[] | null {
    const campos = Object.keys(errores);
    if (!campos.length) return null;

    const destinos = this.destinosDeErrores();
    const sinUbicar: string[] = [];
    let primerPaso: Paso | null = null;
    for (const campo of campos) {
      const destino = destinos[campo];
      if (!destino) {
        sinUbicar.push(errores[campo]);
        continue;
      }
      this.erroresServidor.set(campo, errores[campo]);
      destino.control.updateValueAndValidity({ emitEvent: false });
      destino.control.markAsTouched();
      if (primerPaso === null || destino.paso < primerPaso) primerPaso = destino.paso;
    }
    if (primerPaso !== null) {
      this.pasoMaximo.update((maximo) => (primerPaso! > maximo ? primerPaso! : maximo));
      this.paso.set(primerPaso);
    }
    return sinUbicar;
  }

  private irAPaso(paso: Paso): void {
    this.paso.set(paso);
    this.pasoMaximo.update((maximo) => (paso > maximo ? paso : maximo));
  }

  private todoValido(): boolean {
    return this.general.valid && this.horario.valid && this.acceso.valid;
  }

  private marcarTodo(): void {
    this.general.markAllAsTouched();
    this.horario.markAllAsTouched();
    this.acceso.markAllAsTouched();
  }

  private primerPasoInvalido(): Paso {
    return this.general.invalid ? 1 : this.horario.invalid ? 2 : 3;
  }
}
