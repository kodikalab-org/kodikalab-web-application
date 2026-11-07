import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { apiError } from '../../../core/api';
import { CoachGroup, PractitionerGroup, TeamsApi } from '../../../core/teams-api';
import {
  SegmentoCoach,
  SegmentoPracticante,
  segmentoCoach,
  segmentoPracticante,
} from './segmentos';
import {
  TONOS,
  claseGrupo,
  claseMembresia,
  etiquetaGrupo,
  etiquetaMembresia,
  iniciales,
  nivelTexto,
} from './presentacion';

interface Aviso {
  tipo: 'ok' | 'error';
  texto: string;
}

/**
 * Pestaña «Mis grupos» de `/grupos`. El practicante ve sus membresías por estado y
 * el coach sus grupos publicados y borradores (`GET /teams/me`).
 */
@Component({
  selector: 'app-mis-grupos',
  imports: [RouterLink, MatButtonModule, MatButtonToggleModule, MatCardModule],
  templateUrl: './mis-grupos.html',
  styleUrl: './mis-grupos.css',
})
export class MisGrupos {
  private readonly api = inject(TeamsApi);

  readonly coach = input(false);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly segmentoPracticante = signal<SegmentoPracticante>('activos');
  protected readonly segmentoCoach = signal<SegmentoCoach>('publicados');

  protected readonly membresias = computed(() =>
    this.api.mine().filter((item): item is PractitionerGroup => 'membership' in item && !!item.membership),
  );
  protected readonly gruposCoach = computed(() =>
    this.api.mine().filter((item): item is CoachGroup => 'activeMembers' in item),
  );

  protected readonly activos = computed(() => this.membresiasDe('activos'));
  protected readonly pendientes = computed(() => this.membresiasDe('pendientes'));
  protected readonly historial = computed(() => this.membresiasDe('historial'));
  protected readonly publicados = computed(() => this.coachDe('publicados'));
  protected readonly borradores = computed(() => this.coachDe('borradores'));

  protected readonly practicanteVisible = computed(() => {
    const segmento = this.segmentoPracticante();
    return segmento === 'activos' ? this.activos() : segmento === 'pendientes' ? this.pendientes() : this.historial();
  });
  protected readonly coachVisible = computed(() =>
    this.segmentoCoach() === 'publicados' ? this.publicados() : this.borradores(),
  );

  /** Código recién copiado, para mostrar «Copiado» en su botón. */
  protected readonly copiado = signal<number | null>(null);
  protected readonly avisoCopia = signal('');

  /** Respuestas a una aclaración, por grupo. */
  protected readonly respuestas = signal<Record<number, string>>({});
  protected readonly enviandoId = signal<number | null>(null);
  protected readonly avisos = signal<Record<number, Aviso>>({});

  protected readonly etiquetaMembresia = etiquetaMembresia;
  protected readonly claseMembresia = claseMembresia;
  protected readonly etiquetaGrupo = etiquetaGrupo;
  protected readonly claseGrupo = claseGrupo;
  protected readonly nivelTexto = nivelTexto;
  protected readonly iniciales = iniciales;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.loadMine().subscribe({
      next: () => this.cargando.set(false),
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(apiError(error));
      },
    });
  }

  protected tono(grupo: { groupId: number }): string {
    return TONOS[grupo.groupId % TONOS.length];
  }

  protected respuestaDe(groupId: number): string {
    return this.respuestas()[groupId] ?? '';
  }

  protected escribirRespuesta(groupId: number, texto: string): void {
    this.respuestas.update((actual) => ({ ...actual, [groupId]: texto }));
  }

  /** US06: el postulante responde la aclaración y la solicitud vuelve a PENDIENTE. */
  protected responder(grupo: PractitionerGroup): void {
    const texto = this.respuestaDe(grupo.groupId).trim();
    if (this.enviandoId() !== null) return;
    if (!texto) {
      this.poner(grupo.groupId, { tipo: 'error', texto: 'Escribe una respuesta antes de enviarla.' });
      return;
    }
    this.enviandoId.set(grupo.groupId);
    this.api.respondClarification(grupo.groupId, grupo.membership.membershipId, texto).subscribe({
      next: (response) => {
        this.enviandoId.set(null);
        this.escribirRespuesta(grupo.groupId, '');
        this.poner(grupo.groupId, { tipo: 'ok', texto: response.message });
        this.api.loadMine().subscribe({ error: () => undefined });
      },
      error: (error: unknown) => {
        this.enviandoId.set(null);
        this.poner(grupo.groupId, { tipo: 'error', texto: apiError(error) });
      },
    });
  }

  protected async copiar(grupo: CoachGroup): Promise<void> {
    this.avisoCopia.set('');
    try {
      await navigator.clipboard.writeText(grupo.invitationCode);
      this.copiado.set(grupo.groupId);
      setTimeout(() => {
        if (this.copiado() === grupo.groupId) this.copiado.set(null);
      }, 2000);
    } catch {
      this.avisoCopia.set('No pudimos copiar el código. Selecciónalo y cópialo manualmente.');
    }
  }

  protected solicitudesTexto(cantidad: number): string {
    return cantidad === 1 ? '1 solicitud pendiente' : `${cantidad} solicitudes pendientes`;
  }

  protected fecha(valor: string | null | undefined): string {
    if (!valor) return '—';
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(valor));
  }

  private membresiasDe(segmento: SegmentoPracticante): PractitionerGroup[] {
    return this.membresias().filter((item) => segmentoPracticante(item.membership.status) === segmento);
  }

  private coachDe(segmento: SegmentoCoach): CoachGroup[] {
    return this.gruposCoach().filter((item) => segmentoCoach(item.status) === segmento);
  }

  private poner(groupId: number, aviso: Aviso): void {
    this.avisos.update((actual) => ({ ...actual, [groupId]: aviso }));
  }
}
