import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { combineLatest } from 'rxjs';
import { positiveId } from '../../../../../core/team-api';
import { isCodeforces, submitUrl } from '../../../../../core/problem-links';
import {
  ASSIGNMENT_STATUS,
  AssignedDetail,
  AttemptInfo,
  COMPETITION_STATUS,
  PLATFORM_LABEL,
  PlatformSubmission,
  ProblemsApi,
  VERDICT_LABEL,
  VerificationResult,
  formatDateTime,
  problemsError,
  verdictBadge,
} from '../../../../../core/problems-api';
import { RegistroProblemasResueltos } from '../../../registro-problemas-resueltos/registro-problemas-resueltos';

const PENALIZACION: Record<string, string> = {
  ICPC_20_MIN: 'ICPC · 20 min',
  IOI_POINTS: 'IOI · por puntos',
};

/** Allowed source files, size limit of the backend (64 kB) and the polling of a submission that is still judged. */
const EXTENSIONES = ['.cpp', '.c', '.cc', '.py', '.java', '.kt', '.rs', '.js', '.go'];
const MAX_ARCHIVO = 64 * 1024;
const ESPERA_EVALUACION_MS = 5000;
const MAX_REINTENTOS_EVALUACION = 12;

export type ErrorVerificacion =
  | { tipo: 'sin-handle'; mensaje: string }
  | { tipo: 'caido'; mensaje: string }
  | { tipo: 'otro'; mensaje: string };

/** Text and kind of the error of a verification or of the read of the latest submissions. */
function errorVerificacion(error: unknown): ErrorVerificacion {
  if (error instanceof HttpErrorResponse) {
    const mensaje: unknown = error.error?.message;
    const texto = typeof mensaje === 'string' && mensaje.trim() !== '' ? mensaje.trim() : null;
    if (error.status === 503) {
      return { tipo: 'caido', mensaje: 'Codeforces no responde ahora. Inténtalo en unos minutos.' };
    }
    if (error.status === 409 && texto && /vincula|handle|usuario de codeforces/i.test(texto)) {
      return { tipo: 'sin-handle', mensaje: texto };
    }
    if (error.status === 409 && texto) return { tipo: 'otro', mensaje: texto };
    if (error.status === 400) {
      const archivo: unknown = error.error?.errors?.file;
      return { tipo: 'otro', mensaje: typeof archivo === 'string' ? archivo : (texto ?? 'Revisa los datos enviados.') };
    }
  }
  return { tipo: 'otro', mensaje: problemsError(error) };
}

/** US-08/US-09 (practitioner): one assigned problem with its conditions, the personal attempts and the registration. */
@Component({
  selector: 'app-problema-elegido',
  imports: [RouterLink, MatButtonModule, MatCardModule, RegistroProblemasResueltos],
  templateUrl: './problema-elegido.html',
  styleUrl: './problema-elegido.css',
  host: { class: 'block' },
})
export class ProblemaElegido {
  private readonly api = inject(ProblemsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly estadoAsignacion = ASSIGNMENT_STATUS;
  protected readonly estadoCompetencia = COMPETITION_STATUS;
  protected readonly etiquetaPlataforma = PLATFORM_LABEL;
  protected readonly etiquetaVeredicto = VERDICT_LABEL;
  protected readonly fecha = formatDateTime;

  protected readonly detalle = signal<AssignedDetail | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly teamId = signal<number | null>(null);
  protected readonly registroAbierto = signal(false);
  protected readonly recienRegistrado = signal(false);

  protected readonly extensiones = EXTENSIONES.join(' ');
  protected readonly aceptaArchivo = EXTENSIONES.join(',');
  protected readonly estilo = verdictBadge;
  protected readonly archivo = signal<File | null>(null);
  protected readonly errorArchivo = signal<string | null>(null);
  protected readonly verificando = signal(false);
  protected readonly resultado = signal<VerificationResult | null>(null);
  protected readonly ventana = signal(10);
  protected readonly archivoGuardado = signal(false);
  protected readonly errorVerif = signal<ErrorVerificacion | null>(null);
  protected readonly reintentosAgotados = signal(false);
  protected readonly ultimos = signal<PlatformSubmission[] | null>(null);
  protected readonly cargandoUltimos = signal(false);
  protected readonly errorUltimos = signal<ErrorVerificacion | null>(null);

  private competitionProblemId: number | null = null;
  private request = 0;

  protected readonly asignacion = computed(() => this.detalle()?.assignment ?? null);
  /** Attempts, most recent first. */
  protected readonly intentos = computed<AttemptInfo[]>(() =>
    [...(this.detalle()?.attempts ?? [])].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    ),
  );
  protected readonly ultimoIntento = computed(() => this.intentos()[0] ?? null);

  protected readonly esCodeforces = computed(() => {
    const item = this.asignacion();
    return item !== null && isCodeforces(item.problem);
  });
  protected readonly enlaceResolver = computed(() => {
    const item = this.asignacion();
    return item ? submitUrl(item.problem) : null;
  });
  /** Submissions counted for the competition and the ones sent before it started (they do not count). */
  protected readonly envios = computed(() => (this.resultado()?.submissions ?? []).filter((e) => !e.beforeCompetition));
  protected readonly enviosPrevios = computed(() => (this.resultado()?.submissions ?? []).filter((e) => e.beforeCompetition));
  protected readonly evaluando = computed(() =>
    (this.resultado()?.submissions ?? []).some((e) => e.verdict === 'EN_EVALUACION'),
  );

  /** Reason the registration is not available, or `null` when the practitioner can register the problem. */
  protected readonly bloqueo = computed(() => {
    const item = this.asignacion();
    if (!item) return null;
    if (item.status === 'RESUELTO') return 'Ya registraste este problema como resuelto.';
    if (item.competition.status === 'PROGRAMADA') return 'La competencia aún no ha comenzado.';
    if (this.teamId() === null) return 'Abre el problema desde tu lista de problemas asignados para registrarlo en tu equipo.';
    return null;
  });

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private reintentosEvaluacion = 0;
  private verificacion = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelarEspera());
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(([params, query]) => {
        this.teamId.set(positiveId(query.get('teamId')));
        this.competitionProblemId = positiveId(params.get('competitionProblemId'));
        this.detalle.set(null);
        this.recienRegistrado.set(false);
        this.reiniciarVerificacion();
        this.cargar();
      });
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected abrirRegistro(dialogo: HTMLDialogElement): void {
    this.registroAbierto.set(true);
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  }

  protected cerrarRegistro(dialogo: HTMLDialogElement): void {
    if (typeof dialogo.close === 'function') dialogo.close();
    else dialogo.removeAttribute('open');
    this.registroAbierto.set(false);
  }

  /** The registration was accepted: close the form and reload the state and the attempts. */
  protected alRegistrar(dialogo: HTMLDialogElement): void {
    this.cerrarRegistro(dialogo);
    this.recienRegistrado.set(true);
    this.cargar();
  }

  /** Validates the optional file on the client (extension, empty, 64 kB) before it is sent. */
  protected elegirArchivo(entrada: HTMLInputElement): void {
    const archivo = entrada.files?.[0] ?? null;
    this.errorArchivo.set(null);
    if (!archivo) {
      this.archivo.set(null);
      return;
    }
    const nombre = archivo.name.toLowerCase();
    let mensaje: string | null = null;
    if (!EXTENSIONES.some((ext) => nombre.endsWith(ext))) {
      mensaje = `El archivo debe ser de código fuente (${this.extensiones}).`;
    } else if (archivo.size === 0) {
      mensaje = 'El archivo está vacío.';
    } else if (archivo.size > MAX_ARCHIVO) {
      mensaje = 'El archivo supera el máximo de 64 kB.';
    }
    if (mensaje) {
      this.archivo.set(null);
      this.errorArchivo.set(mensaje);
      entrada.value = '';
      return;
    }
    this.archivo.set(archivo);
  }

  protected quitarArchivo(entrada: HTMLInputElement): void {
    entrada.value = '';
    this.archivo.set(null);
    this.errorArchivo.set(null);
  }

  /** "Verificar mi solución": reads the latest submissions of the Codeforces account and records them. */
  protected verificar(cantidad = 10): void {
    if (this.competitionProblemId === null || this.verificando()) return;
    this.cancelarEspera();
    this.reintentosEvaluacion = 0;
    this.reintentosAgotados.set(false);
    this.archivoGuardado.set(false);
    this.ventana.set(cantidad);
    this.ejecutarVerificacion(this.archivo() ?? undefined, cantidad);
  }

  protected ampliarBusqueda(): void {
    this.verificar(100);
  }

  /** Loads (or refreshes) the table of the latest submissions of the account; nothing is saved. */
  protected cargarUltimos(): void {
    const id = this.competitionProblemId;
    if (id === null || this.cargandoUltimos()) return;
    this.cargandoUltimos.set(true);
    this.errorUltimos.set(null);
    this.api.platformSubmissions(id, 10).subscribe({
      next: (respuesta) => {
        this.ultimos.set(respuesta.submissions);
        this.cargandoUltimos.set(false);
      },
      error: (error) => {
        this.errorUltimos.set(errorVerificacion(error));
        this.cargandoUltimos.set(false);
      },
    });
  }

  protected tiempo(ms: number | null | undefined): string {
    return ms === null || ms === undefined ? '—' : `${ms} ms`;
  }

  protected memoria(kb: number | null | undefined): string {
    if (kb === null || kb === undefined) return '—';
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  }

  protected numero(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : String(valor);
  }

  protected penalizacion(regla: string | null): string {
    return regla ? (PENALIZACION[regla] ?? regla) : '—';
  }

  protected duracion(minutos: number | null): string {
    if (minutos === null) return '—';
    const horas = minutos / 60;
    return Number.isInteger(horas) ? `${horas} ${horas === 1 ? 'hora' : 'horas'}` : `${minutos} min`;
  }

  private ejecutarVerificacion(archivo: File | undefined, cantidad: number): void {
    const id = this.competitionProblemId;
    if (id === null) return;
    const actual = ++this.verificacion;
    this.verificando.set(true);
    this.errorVerif.set(null);
    this.api.verify(id, archivo, cantidad === 10 ? undefined : cantidad).subscribe({
      next: (resultado) => {
        if (actual !== this.verificacion) return;
        this.verificando.set(false);
        this.resultado.set(resultado);
        if (resultado.fileStored) this.archivoGuardado.set(true);
        this.cargar();
        if (resultado.submissions.some((e) => e.verdict === 'EN_EVALUACION')) this.programarReintento(cantidad);
      },
      error: (error) => {
        if (actual !== this.verificacion) return;
        this.verificando.set(false);
        this.errorVerif.set(errorVerificacion(error));
      },
    });
  }

  /** A submission still judged by Codeforces: verify again every 5 s, at most 12 times. */
  private programarReintento(cantidad: number): void {
    if (this.reintentosEvaluacion >= MAX_REINTENTOS_EVALUACION) {
      this.reintentosAgotados.set(true);
      return;
    }
    this.reintentosEvaluacion++;
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.ejecutarVerificacion(undefined, cantidad);
    }, ESPERA_EVALUACION_MS);
  }

  private cancelarEspera(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private reiniciarVerificacion(): void {
    this.cancelarEspera();
    this.verificacion++;
    this.reintentosEvaluacion = 0;
    this.verificando.set(false);
    this.resultado.set(null);
    this.errorVerif.set(null);
    this.reintentosAgotados.set(false);
    this.archivo.set(null);
    this.errorArchivo.set(null);
    this.archivoGuardado.set(false);
    this.ventana.set(10);
    this.ultimos.set(null);
    this.errorUltimos.set(null);
  }

  private cargar(): void {
    const id = this.competitionProblemId;
    const actual = ++this.request;
    if (id === null) {
      this.error.set('El problema solicitado no es válido.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.api.assignedDetail(id).subscribe({
      next: (detalle) => {
        if (actual !== this.request) return;
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (error) => {
        if (actual !== this.request) return;
        this.error.set(problemsError(error));
        this.cargando.set(false);
      },
    });
  }
}
