import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, startWith } from 'rxjs';
import { apiError } from '../../../core/api';
import {
  JoinFailure,
  MembershipStatus,
  PractitionerGroup,
  StudyGroupSummary,
  TeamsApi,
  classifyJoinError,
  normalizeText,
} from '../../../core/teams-api';

type Vista =
  | ''
  | 'solicitar'
  | 'enviada'
  | 'ingreso'
  | 'codigo'
  | 'estado'
  | 'duplicada'
  | 'sin-cupos'
  | 'no-admite'
  | 'error';

/** Qué puede hacer el practicante con un grupo según el estado de su membresía. */
export type AccionGrupo = 'unirme' | 'solicitar' | 'pendiente' | 'miembro' | 'bloqueado';

export interface GrupoVm {
  id: number;
  iniciales: string;
  nombre: string;
  nivel: string;
  nivelValor: string;
  publico: boolean;
  descripcion: string;
  horario: string;
  cupo: number | null;
  membresia: MembershipStatus | null;
  estado: string;
  accion: AccionGrupo;
  etiquetaAccion: string;
  nota: string | null;
  tono: string;
  /** Nombre y descripción sin acentos ni mayúsculas, para buscar. */
  texto: string;
}

const TONOS = [
  'from-[#7000ff] to-[#af6dff]',
  'from-[#00a9a4] to-[#54e4cd]',
  'from-[#2360e8] to-[#60a5fa]',
  'from-[#a020dc] to-[#e7a5f9]',
  'from-[#bf125d] to-[#f44d91]',
  'from-[#078b3e] to-[#54d884]',
];

const NIVELES: Record<string, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

const SIN_FILTROS = {
  buscar: '',
  principiante: false,
  intermedio: false,
  avanzado: false,
  publico: false,
  protegido: false,
  miembro: false,
  pendiente: false,
};

const TITULOS: Record<JoinFailure, string> = {
  SOLICITUD_DUPLICADA: 'Ya tienes una solicitud pendiente',
  YA_ES_MIEMBRO: 'Ya eres miembro de este grupo',
  SIN_CUPO: 'El grupo no tiene cupo',
  EXPULSADO: 'No puedes volver a este grupo',
  NO_ADMITE: 'Este grupo no admite postulaciones',
  SIN_PERMISO: 'No pudimos registrar tu solicitud',
  NO_ENCONTRADO: 'El grupo ya no está disponible',
  OTRO: 'No pudimos registrar tu solicitud',
};

/** El código se recorta y, si se escribe, solo puede tener letras y números. */
function codigoAlfanumerico(control: AbstractControl): ValidationErrors | null {
  const valor = typeof control.value === 'string' ? control.value.trim() : '';
  return !valor || /^[A-Za-z0-9]+$/.test(valor) ? null : { alfanumerico: true };
}

@Component({
  selector: 'app-explorar-grupos',
  imports: [
    A11yModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './explorar-grupos.html',
  styleUrl: './explorar-grupos.css',
})
export class ExplorarGrupos {
  private readonly api = inject(TeamsApi);
  private cargaEnCurso?: Subscription;

  protected readonly grupos = signal<GrupoVm[]>([]);
  protected readonly cargando = signal(true);
  /** Falló la carga de grupos: se muestra con un botón para reintentar. */
  protected readonly errorCarga = signal('');
  /** No se pudo consultar el estado de las membresías del usuario. */
  protected readonly avisoMembresias = signal('');
  protected readonly vista = signal<Vista>('');
  protected readonly seleccionado = signal<GrupoVm | null>(null);
  protected readonly enviando = signal(false);
  protected readonly fallo = signal<JoinFailure | null>(null);
  protected readonly mensajeFallo = signal('');
  private ultimoIntento: { groupId: number; codigo: string } | null = null;

  protected readonly filtros = new FormGroup({
    buscar: new FormControl('', { nonNullable: true }),
    principiante: new FormControl(false, { nonNullable: true }),
    intermedio: new FormControl(false, { nonNullable: true }),
    avanzado: new FormControl(false, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    protegido: new FormControl(false, { nonNullable: true }),
    miembro: new FormControl(false, { nonNullable: true }),
    pendiente: new FormControl(false, { nonNullable: true }),
  });
  private readonly valoresFiltros = toSignal(
    this.filtros.valueChanges.pipe(startWith(this.filtros.getRawValue())),
    { requireSync: true },
  );

  /** Grupos que cumplen la búsqueda y los filtros activos. */
  protected readonly visibles = computed(() => {
    const filtros = { ...SIN_FILTROS, ...this.valoresFiltros() };
    const texto = normalizeText(filtros.buscar ?? '');
    const niveles = (['principiante', 'intermedio', 'avanzado'] as const).filter(
      (nivel) => filtros[nivel],
    );
    return this.grupos().filter((grupo) => {
      if (texto && !grupo.texto.includes(texto)) return false;
      if (niveles.length && !niveles.some((nivel) => nivel === grupo.nivelValor.toLowerCase())) {
        return false;
      }
      if (filtros.publico !== filtros.protegido && grupo.publico !== filtros.publico) return false;
      const participacion =
        (filtros.miembro && grupo.membresia === 'ACTIVO') ||
        (filtros.pendiente && grupo.membresia === 'PENDIENTE');
      return !(filtros.miembro || filtros.pendiente) || participacion;
    });
  });
  protected readonly hayFiltros = computed(() => {
    const filtros = { ...SIN_FILTROS, ...this.valoresFiltros() };
    return Object.entries(SIN_FILTROS).some(([clave, inicial]) => {
      const actual = filtros[clave as keyof typeof SIN_FILTROS];
      return typeof actual === 'string' ? actual.trim() !== inicial : actual !== inicial;
    });
  });

  protected readonly codigo = new FormGroup({
    grupo: new FormControl<number | null>(null, {
      validators: (control) =>
        this.vista() === 'codigo' && control.value === null ? { required: true } : null,
    }),
    invitacion: new FormControl('', {
      nonNullable: true,
      validators: [
        codigoAlfanumerico,
        (control) =>
          this.vista() === 'codigo' && !control.value.trim() ? { required: true } : null,
      ],
    }),
  });
  protected readonly mensajesCodigo = {
    required: 'Ingresa el código de invitación.',
    alfanumerico: 'El código solo puede tener letras y números, sin espacios ni símbolos.',
  };

  constructor() {
    this.cargar();
  }

  protected cargar(silencioso = false): void {
    this.cargaEnCurso?.unsubscribe();
    if (!silencioso) this.cargando.set(true);
    this.errorCarga.set('');
    this.avisoMembresias.set('');
    this.cargaEnCurso = this.api.loadGroups().subscribe({
      next: (groups) =>
        this.api.loadMine().subscribe({
          next: (mine) => {
            this.grupos.set(this.mapear(groups, mine as PractitionerGroup[]));
            this.cargando.set(false);
          },
          error: () => {
            this.grupos.set(this.mapear(groups, []));
            this.avisoMembresias.set(
              'No pudimos consultar tus membresías: puede que algunas acciones no reflejen tu estado actual.',
            );
            this.cargando.set(false);
          },
        }),
      error: (error: unknown) => {
        this.cargando.set(false);
        if (!silencioso) this.grupos.set([]);
        this.errorCarga.set(apiError(error));
      },
    });
  }

  protected limpiarFiltros(): void {
    this.filtros.reset();
  }

  protected abrirAccion(grupo: GrupoVm): void {
    if (this.enviando() || (grupo.accion !== 'unirme' && grupo.accion !== 'solicitar')) return;
    this.seleccionado.set(grupo);
    this.fallo.set(null);
    // Los grupos públicos no piden aprobación: el ingreso se registra directo.
    if (grupo.publico) {
      this.intentar(grupo.id, '');
      return;
    }
    this.codigo.reset({ grupo: grupo.id, invitacion: '' });
    this.vista.set('solicitar');
    this.codigo.updateValueAndValidity();
  }

  protected abrirConCodigo(): void {
    this.seleccionado.set(null);
    this.fallo.set(null);
    this.codigo.reset({ grupo: null, invitacion: '' });
    this.vista.set('codigo');
    this.codigo.updateValueAndValidity();
  }

  protected cerrar(): void {
    this.vista.set('');
    this.seleccionado.set(null);
    this.fallo.set(null);
    this.mensajeFallo.set('');
  }

  protected enviar(): void {
    if (this.enviando()) return;
    const vista = this.vista();
    if (vista !== 'solicitar' && vista !== 'codigo') return;
    if (this.codigo.invalid) {
      this.codigo.markAllAsTouched();
      return;
    }
    const groupId = vista === 'codigo' ? this.codigo.controls.grupo.value : this.seleccionado()?.id;
    if (groupId === null || groupId === undefined) return;
    this.intentar(groupId, this.codigo.controls.invitacion.value.trim());
  }

  protected reintentar(): void {
    if (this.enviando() || !this.ultimoIntento) return;
    this.intentar(this.ultimoIntento.groupId, this.ultimoIntento.codigo);
  }

  protected verEstado(grupo: GrupoVm): void {
    this.seleccionado.set(grupo);
    this.vista.set('estado');
  }

  protected tituloFallo(): string {
    const fallo = this.fallo();
    return fallo ? TITULOS[fallo] : TITULOS.OTRO;
  }

  protected nombreGrupo(): string {
    return this.seleccionado()?.nombre ?? 'el grupo';
  }

  protected mensajeCodigo(control: AbstractControl, textos: Record<string, string>): string {
    const errores = control.errors;
    const clave = errores ? Object.keys(textos).find((tipo) => tipo in errores) : undefined;
    return clave ? textos[clave] : 'Revisa este campo.';
  }

  private intentar(groupId: number, codigo: string): void {
    this.ultimoIntento = { groupId, codigo };
    this.enviando.set(true);
    this.api.join(groupId, codigo).subscribe({
      next: (response) => {
        this.enviando.set(false);
        this.seleccionado.set(this.grupos().find((g) => g.id === groupId) ?? null);
        this.vista.set(response.status === 'ACTIVO' ? 'ingreso' : 'enviada');
        this.cargar(true);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        const fallo = classifyJoinError(error);
        this.fallo.set(fallo);
        this.seleccionado.set(this.grupos().find((g) => g.id === groupId) ?? this.seleccionado());
        this.mensajeFallo.set(this.mensajeDe(fallo, error));
        this.vista.set(this.vistaDe(fallo));
        // El estado real pudo cambiar (solicitud previa, cupo, expulsión): se refresca el listado.
        if (fallo !== 'OTRO' && fallo !== 'SIN_PERMISO') this.cargar(true);
      },
    });
  }

  private vistaDe(fallo: JoinFailure): Vista {
    switch (fallo) {
      case 'SOLICITUD_DUPLICADA':
      case 'YA_ES_MIEMBRO':
        return 'duplicada';
      case 'SIN_CUPO':
        return 'sin-cupos';
      case 'EXPULSADO':
      case 'NO_ADMITE':
      case 'NO_ENCONTRADO':
        return 'no-admite';
      default:
        return 'error';
    }
  }

  private mensajeDe(fallo: JoinFailure, error: unknown): string {
    switch (fallo) {
      case 'SIN_PERMISO':
        return 'Tu cuenta no puede unirse a grupos: solo los practicantes con el perfil completo pueden hacerlo.';
      case 'NO_ENCONTRADO':
        return 'El grupo ya no existe o dejó de estar disponible.';
      default:
        return apiError(error);
    }
  }

  private mapear(groups: StudyGroupSummary[], mine: PractitionerGroup[]): GrupoVm[] {
    const membresias = new Map<number, MembershipStatus>();
    for (const item of mine) {
      if (item.membership) membresias.set(item.groupId, item.membership.status);
    }

    return groups.map((group, index) => {
      const publico = group.visibility === 'PUBLICO';
      const membresia = membresias.get(group.groupId) ?? null;
      const nivelValor = group.expectedLevel ?? '';
      return {
        id: group.groupId,
        iniciales: this.iniciales(group.name),
        nombre: group.name,
        nivel: NIVELES[nivelValor] ?? (nivelValor || 'Sin definir'),
        nivelValor,
        publico,
        descripcion: group.description || 'Sin descripción.',
        horario: group.sessionSchedule || 'Horario por definir',
        cupo: group.maxCapacity,
        membresia,
        ...this.estadoDe(membresia, publico),
        tono: TONOS[index % TONOS.length],
        texto: normalizeText(`${group.name} ${group.description ?? ''}`),
      };
    });
  }

  /** El estado de la membresía decide la insignia, la acción y la nota de la tarjeta. */
  private estadoDe(
    membresia: MembershipStatus | null,
    publico: boolean,
  ): Pick<GrupoVm, 'estado' | 'accion' | 'etiquetaAccion' | 'nota'> {
    const ingresar = publico ? 'Unirme' : 'Solicitar ingreso';
    const accion: AccionGrupo = publico ? 'unirme' : 'solicitar';
    switch (membresia) {
      case 'ACTIVO':
        return { estado: 'Eres miembro', accion: 'miembro', etiquetaAccion: 'Ver grupo', nota: null };
      case 'PENDIENTE':
        return {
          estado: 'Solicitud pendiente',
          accion: 'pendiente',
          etiquetaAccion: 'Solicitud pendiente',
          nota: null,
        };
      case 'EXPULSADO':
        return {
          estado: 'Sin acceso',
          accion: 'bloqueado',
          etiquetaAccion: 'No disponible',
          nota: 'Fuiste expulsado de este grupo y no puedes volver a solicitar ingreso.',
        };
      case 'RECHAZADO':
        return {
          estado: 'Solicitud rechazada',
          accion,
          etiquetaAccion: publico ? 'Volver a unirme' : 'Volver a solicitar',
          nota: 'Tu solicitud anterior fue rechazada. Puedes volver a solicitar.',
        };
      case 'RETIRADO':
        return {
          estado: 'Saliste del grupo',
          accion,
          etiquetaAccion: publico ? 'Volver a unirme' : 'Volver a solicitar',
          nota: 'Saliste de este grupo. Puedes volver a ingresar.',
        };
      default:
        return { estado: 'Abierto', accion, etiquetaAccion: ingresar, nota: null };
    }
  }

  private iniciales(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}
