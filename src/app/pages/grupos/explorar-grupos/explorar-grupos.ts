import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { apiError } from '../../../core/api';
import {
  Clarification,
  Membership,
  PractitionerGroup,
  StudyGroupSummary,
  TeamsApi,
} from '../../../core/teams-api';
import { TONOS, iniciales, nivelTexto } from '../mis-grupos/presentacion';
import {
  LONGITUD_CODIGO,
  codigoValido,
  mensajeErrorCodigo,
  normalizarCodigo,
} from './codigo-invitacion';

type Vista =
  | ''
  | 'solicitar'
  | 'enviada'
  | 'ingreso'
  | 'estado'
  | 'duplicada'
  | 'sin-cupos'
  | 'error';

interface GrupoVm {
  id: number;
  iniciales: string;
  nombre: string;
  nivel: string;
  publico: boolean;
  descripcion: string;
  horario: string;
  cupo: number | null;
  estado:
    | 'Abierto'
    | 'Tuyo'
    | 'Solicitud pendiente'
    | 'Aclaración solicitada'
    | 'Eres miembro'
    | 'Expulsado';
  accion: string;
  tono: string;
  membershipId?: number;
  estadoMembresia?: Membership['status'];
  aclaracion?: Clarification | null;
  /** El grupo pertenece al coach de la sesión. */
  propio: boolean;
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
  ],
  templateUrl: './explorar-grupos.html',
  styleUrl: './explorar-grupos.css',
})
export class ExplorarGrupos {
  private readonly api = inject(TeamsApi);

  /** El coach ve el mismo listado, sin acciones de ingreso (lo decide `GruposHub`). */
  readonly coach = input(false);

  private readonly datos = signal<{ groups: StudyGroupSummary[]; mine: unknown[] }>({
    groups: [],
    mine: [],
  });
  protected readonly grupos = computed(() =>
    this.mapear(
      this.datos().groups,
      this.datos().mine as (PractitionerGroup | { groupId: number })[],
    ),
  );
  protected readonly cargando = signal(true);
  /** Error al cargar el listado. */
  protected readonly errorCarga = signal('');
  /** Error al enviar un ingreso o una solicitud. */
  protected readonly error = signal('');
  protected readonly vista = signal<Vista>('');
  protected readonly seleccionado = signal<GrupoVm | null>(null);
  protected readonly enviando = signal(false);
  /** Respuesta del practicante cuando el coach pidió una aclaración. */
  protected readonly respuesta = signal('');
  protected readonly enviandoRespuesta = signal(false);
  protected readonly respuestaOk = signal('');
  protected readonly respuestaError = signal('');

  /** «Ingresar con código»: el servidor resuelve el grupo a partir del código. */
  protected readonly longitudCodigo = LONGITUD_CODIGO;
  protected readonly codigoTexto = signal('');
  protected readonly codigoCompleto = computed(() => codigoValido(this.codigoTexto()));
  protected readonly codigoEnviando = signal(false);
  protected readonly codigoError = signal('');
  protected readonly codigoOk = signal('');

  protected readonly total = computed(() => this.grupos().length);

  protected readonly secciones = computed(() => [
    {
      titulo: 'Nivel',
      opciones: [
        ['principiante', 'Principiante'],
        ['intermedio', 'Intermedio'],
        ['avanzado', 'Avanzado'],
      ],
    },
    {
      titulo: 'Visibilidad',
      opciones: [
        ['publico', 'Público'],
        ['protegido', 'Protegido'],
      ],
    },
    this.coach()
      ? { titulo: 'Mis grupos', opciones: [['propio', 'Solo los míos']] }
      : {
          titulo: 'Mi participación',
          opciones: [
            ['miembro', 'Soy miembro'],
            ['pendiente', 'Solicitud pendiente'],
          ],
        },
  ]);

  protected readonly filtros = new FormGroup({
    buscar: new FormControl('', { nonNullable: true }),
    principiante: new FormControl(false, { nonNullable: true }),
    intermedio: new FormControl(false, { nonNullable: true }),
    avanzado: new FormControl(false, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    protegido: new FormControl(false, { nonNullable: true }),
    miembro: new FormControl(false, { nonNullable: true }),
    pendiente: new FormControl(false, { nonNullable: true }),
    propio: new FormControl(false, { nonNullable: true }),
  });

  private readonly filtros$ = toSignal(
    this.filtros.valueChanges.pipe(startWith(this.filtros.getRawValue())),
    { initialValue: this.filtros.getRawValue() },
  );

  /** US05: búsqueda y filtros reales sobre los grupos que devuelve la API. */
  protected readonly visibles = computed(() => {
    const filtro = this.filtros$();
    const texto = (filtro.buscar ?? '').trim().toLowerCase();

    const niveles: string[] = [];
    if (filtro.principiante) niveles.push('Principiante');
    if (filtro.intermedio) niveles.push('Intermedio');
    if (filtro.avanzado) niveles.push('Avanzado');

    const publico = filtro.publico === true;
    const protegido = filtro.protegido === true;
    const filtraVisibilidad = publico !== protegido;

    return this.grupos().filter((grupo) => {
      if (texto && !grupo.nombre.toLowerCase().includes(texto)) return false;
      if (niveles.length > 0 && !niveles.includes(grupo.nivel)) return false;
      if (filtraVisibilidad && publico !== grupo.publico) return false;
      if (filtro.miembro && grupo.estado !== 'Eres miembro') return false;
      if (filtro.propio && !grupo.propio) return false;
      if (
        filtro.pendiente &&
        grupo.estado !== 'Solicitud pendiente' &&
        grupo.estado !== 'Aclaración solicitada'
      ) {
        return false;
      }
      return true;
    });
  });

  protected limpiarFiltros(): void {
    this.filtros.reset({
      buscar: '',
      principiante: false,
      intermedio: false,
      avanzado: false,
      publico: false,
      protegido: false,
      miembro: false,
      pendiente: false,
      propio: false,
    });
  }

  constructor() {
    this.cargar();
  }

  protected abrirSolicitud(grupo: GrupoVm): void {
    this.seleccionado.set(grupo);
    // Los grupos públicos no piden aprobación: el ingreso se registra directo.
    if (grupo.publico) {
      this.enviar();
      return;
    }
    this.vista.set('solicitar');
  }

  protected cerrar(): void {
    this.vista.set('');
    this.seleccionado.set(null);
    this.error.set('');
  }

  protected enviar(): void {
    const grupo = this.seleccionado();
    if (!grupo || this.enviando()) return;

    this.enviando.set(true);
    this.error.set('');

    this.api.join(grupo.id).subscribe({
      next: (response) => {
        this.enviando.set(false);
        this.vista.set(response.status === 'ACTIVO' ? 'ingreso' : 'enviada');
        this.cargar();
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.vista.set(this.vistaDeError(error));
        this.error.set(apiError(error));
      },
    });
  }

  /** Mantiene el código en mayúsculas, sin símbolos y con 12 caracteres como máximo. */
  protected escribirCodigo(campo: HTMLInputElement): void {
    const codigo = normalizarCodigo(campo.value);
    campo.value = codigo;
    this.codigoTexto.set(codigo);
    this.codigoError.set('');
    this.codigoOk.set('');
  }

  protected ingresarConCodigo(): void {
    const codigo = this.codigoTexto();
    if (!codigoValido(codigo) || this.codigoEnviando()) return;

    this.codigoEnviando.set(true);
    this.codigoError.set('');
    this.codigoOk.set('');
    this.api.joinByCode(codigo).subscribe({
      next: (response) => {
        this.codigoEnviando.set(false);
        this.codigoTexto.set('');
        this.codigoOk.set(response.message || 'Ingresaste al grupo correctamente.');
        this.cargar();
      },
      error: (error: unknown) => {
        this.codigoEnviando.set(false);
        this.codigoError.set(mensajeErrorCodigo(error));
      },
    });
  }

  protected verEstado(grupo: GrupoVm): void {
    this.seleccionado.set(grupo);
    this.respuesta.set('');
    this.respuestaOk.set('');
    this.respuestaError.set('');
    this.vista.set('estado');
  }

  /** US06: el postulante responde la aclaración y la solicitud vuelve a PENDIENTE. */
  protected responder(): void {
    const grupo = this.seleccionado();
    if (!grupo?.membershipId || this.enviandoRespuesta()) return;

    const texto = this.respuesta().trim();
    if (!texto) {
      this.respuestaError.set('Escribe una respuesta antes de enviarla.');
      return;
    }

    this.enviandoRespuesta.set(true);
    this.respuestaError.set('');
    this.api.respondClarification(grupo.id, grupo.membershipId, texto).subscribe({
      next: (response) => {
        this.enviandoRespuesta.set(false);
        this.respuestaOk.set(response.message);
        this.respuesta.set('');
        this.cargar();
      },
      error: (error: unknown) => {
        this.enviandoRespuesta.set(false);
        this.respuestaError.set(apiError(error));
      },
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.api.loadGroups().subscribe({
      next: (groups) =>
        this.api.loadMine().subscribe({
          next: (mine) => {
            this.datos.set({ groups, mine });
            this.cargando.set(false);
          },
          error: () => {
            this.datos.set({ groups, mine: [] });
            this.cargando.set(false);
          },
        }),
      error: (error: unknown) => {
        this.cargando.set(false);
        this.errorCarga.set(apiError(error));
      },
    });
  }

  private mapear(
    groups: StudyGroupSummary[],
    mine: (PractitionerGroup | { groupId: number })[],
  ): GrupoVm[] {
    const esCoach = this.coach();
    const memberships = new Map<number, PractitionerGroup['membership']>();
    const propios = new Set<number>();
    for (const item of mine) {
      const membership = (item as PractitionerGroup).membership;
      if (membership) memberships.set(item.groupId, membership);
      else if (esCoach) propios.add(item.groupId);
    }

    return groups.map((group, index) => {
      const membership = esCoach ? undefined : memberships.get(group.groupId);
      const status = membership?.status;
      const propio = esCoach && propios.has(group.groupId);
      return {
        id: group.groupId,
        iniciales: iniciales(group.name),
        nombre: group.name,
        nivel: nivelTexto(group.expectedLevel),
        publico: group.visibility === 'PUBLICO',
        descripcion: group.description || 'Sin descripción.',
        horario: group.sessionSchedule || 'Horario por definir',
        cupo: group.maxCapacity,
        estado: propio
          ? 'Tuyo'
          : status === 'ACTIVO'
            ? 'Eres miembro'
            : status === 'PENDIENTE'
              ? 'Solicitud pendiente'
              : status === 'ACLARACION_SOLICITADA'
                ? 'Aclaración solicitada'
                : status === 'EXPULSADO'
                  ? 'Expulsado'
                  : 'Abierto',
        accion: group.visibility === 'PUBLICO' ? 'Unirme' : 'Solicitar ingreso',
        tono: TONOS[index % TONOS.length],
        membershipId: membership?.membershipId,
        estadoMembresia: status,
        aclaracion: membership?.clarification ?? null,
        propio,
      };
    });
  }

  private vistaDeError(error: unknown): Vista {
    if (!(error instanceof HttpErrorResponse)) return 'error';
    const message = apiError(error).toLowerCase();
    if (message.includes('cupo')) return 'sin-cupos';
    if (message.includes('solicitud activa') || message.includes('miembro')) return 'duplicada';
    if (message.includes('no está publicado') || message.includes('no admite')) return 'sin-cupos';
    return 'error';
  }
}
