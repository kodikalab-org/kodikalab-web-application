import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { apiError } from '../../../core/api';
import {
  Membership,
  PractitionerGroup,
  StudyGroupSummary,
  TeamsApi,
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
  estado: 'Abierto' | 'Solicitud pendiente' | 'Eres miembro';
  accion: string;
  tono: string;
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
  Div3: 'Div3',
  Div2: 'Div2',
  Regional: 'Regional',
};

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

  protected readonly grupos = signal<GrupoVm[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly vista = signal<Vista>('');
  protected readonly seleccionado = signal<GrupoVm | null>(null);
  protected readonly grupoCodigo = signal<number | null>(null);
  protected readonly enviando = signal(false);

  protected readonly total = computed(() => this.grupos().length);

  protected readonly filtros = new FormGroup({
    buscar: new FormControl('', { nonNullable: true }),
    principiante: new FormControl(false, { nonNullable: true }),
    intermedio: new FormControl(true, { nonNullable: true }),
    avanzado: new FormControl(false, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    protegido: new FormControl(false, { nonNullable: true }),
    miembro: new FormControl(false, { nonNullable: true }),
    pendiente: new FormControl(false, { nonNullable: true }),
  });

  protected readonly codigo = new FormGroup({
    invitacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[A-Za-z0-9]{12}$/)],
    }),
  });

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

  protected abrirConCodigo(): void {
    this.seleccionado.set(null);
    this.grupoCodigo.set(this.grupos()[0]?.id ?? null);
    this.codigo.reset({ invitacion: '' });
    this.vista.set('codigo');
  }

  protected cerrar(): void {
    this.vista.set('');
    this.seleccionado.set(null);
    this.error.set('');
  }

  protected enviar(): void {
    const grupo = this.seleccionado();
    const groupId = this.vista() === 'codigo' ? this.grupoCodigo() : grupo?.id ?? null;
    if (groupId === null || this.enviando()) return;

    const esCodigo = this.vista() === 'codigo';
    if (esCodigo && this.codigo.invalid) return;

    this.enviando.set(true);
    this.error.set('');

    this.api
      .join(groupId, esCodigo ? this.codigo.controls.invitacion.value : '')
      .subscribe({
        next: (response) => {
          this.enviando.set(false);
          this.seleccionado.set(this.grupos().find((g) => g.id === groupId) ?? null);
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

  protected verEstado(grupo: GrupoVm): void {
    this.seleccionado.set(grupo);
    this.vista.set('estado');
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.loadGroups().subscribe({
      next: (groups) => this.api.loadMine().subscribe({
        next: (mine) => {
          this.grupos.set(this.mapear(groups, mine));
          this.cargando.set(false);
        },
        error: () => {
          this.grupos.set(this.mapear(groups, []));
          this.cargando.set(false);
        },
      }),
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(apiError(error));
      },
    });
  }

  private mapear(
    groups: StudyGroupSummary[],
    mine: (PractitionerGroup | { groupId: number })[],
  ): GrupoVm[] {
    const memberships = new Map<number, Membership['status']>();
    for (const item of mine) {
      const membership = (item as PractitionerGroup).membership;
      if (membership) memberships.set(item.groupId, membership.status);
    }

    return groups.map((group, index) => {
      const status = memberships.get(group.groupId);
      return {
        id: group.groupId,
        iniciales: this.iniciales(group.name),
        nombre: group.name,
        nivel: NIVELES[group.expectedLevel ?? ''] ?? (group.expectedLevel || 'Sin definir'),
        publico: group.visibility === 'PUBLICO',
        descripcion: group.description || 'Sin descripción.',
        horario: group.sessionSchedule || 'Horario por definir',
        cupo: group.maxCapacity,
        estado:
          status === 'ACTIVO'
            ? 'Eres miembro'
            : status === 'PENDIENTE'
              ? 'Solicitud pendiente'
              : 'Abierto',
        accion: group.visibility === 'PUBLICO' ? 'Unirme' : 'Solicitar ingreso',
        tono: TONOS[index % TONOS.length],
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

  private iniciales(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}
