import { Directive, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Session } from '../core/session';
import { positiveId, TeamApi } from '../core/team-api';
@Directive()
export abstract class TeamPage implements OnInit, OnDestroy {
  readonly session = inject(Session);
  protected readonly api = inject(TeamApi);
  protected readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly teamId = signal<number | null>(null);
  readonly busy = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly fields = signal<[string, string][]>([]);
  readonly message = signal('');
  readonly context = new FormGroup({ teamId: new FormControl('', { nonNullable: true }) });
  private readonly reads = new Subscription();
  private active = new Subscription();
  protected version = 0;
  private readVersion = 0;
  ngOnInit() {
    this.reads.add(
      this.route.queryParamMap.subscribe((params) => {
        this.version++;
        this.active.unsubscribe();
        this.active = new Subscription();
        const raw = params.get('teamId');
        this.teamId.set(positiveId(raw));
        this.context.controls.teamId.setValue(raw ?? '');
        this.error.set('');
        this.message.set('');
        this.fields.set([]);
        this.busy.set(false);
        this.clear();
        if (raw && !this.teamId())
          this.error.set('El equipo debe identificarse con un entero positivo válido.');
        if (this.teamId()) this.reload();
      }),
    );
  }
  selectTeam() {
    const id = positiveId(this.context.controls.teamId.value);
    if (!id) {
      this.error.set('Introduce un identificador real de equipo válido.');
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { teamId: id },
      queryParamsHandling: 'merge',
    });
  }
  protected read<T>(
    request: Observable<T>,
    success: (value: T) => void,
    failure?: (e: unknown) => void,
  ) {
    const version = this.version;
    const readVersion = ++this.readVersion;
    this.busy.set(true);
    this.error.set('');
    this.fields.set([]);
    this.active.add(
      request.subscribe({
        next: (value) => {
          if (version === this.version && readVersion === this.readVersion) {
            this.busy.set(false);
            success(value);
          }
        },
        error: (e) => {
          if (version === this.version && readVersion === this.readVersion) {
            this.busy.set(false);
            this.fail(e);
            failure?.(e);
          }
        },
      }),
    );
  }
  protected write<T>(request: Observable<T>, success: (value: T) => void) {
    const version = this.version;
    this.saving.set(true);
    this.error.set('');
    this.fields.set([]);
    this.message.set('');
    // An HTTP cancellation cannot guarantee that a server write was rolled back.
    this.reads.add(
      request.subscribe({
        next: (value) => {
          this.saving.set(false);
          if (version === this.version) success(value);
        },
        error: (e) => {
          this.saving.set(false);
          if (version === this.version) this.fail(e);
        },
      }),
    );
  }
  protected fail(e: unknown) {
    if (!(e instanceof HttpErrorResponse)) {
      this.error.set('No se pudo completar la operación.');
      return;
    }
    const messages: Record<number, string> = {
      0: 'No pudimos conectar. Verifica la API y el proxy.',
      401: 'Inicia sesión de nuevo.',
      403: 'No tienes autorización para este equipo.',
      404: 'El recurso no existe.',
      409: 'Los datos son inconsistentes o el registro está duplicado.',
      503: 'Información no disponible. Vuelve a consultar.',
    };
    this.error.set(
      typeof e.error?.message === 'string'
        ? e.error.message
        : (messages[e.status] ?? 'No se pudo completar la operación.'),
    );
    this.fields.set(
      Object.entries(e.error?.errors ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
  abstract reload(): void;
  protected abstract clear(): void;
  ngOnDestroy() {
    this.version++;
    this.active.unsubscribe();
    this.reads.unsubscribe();
  }
}
