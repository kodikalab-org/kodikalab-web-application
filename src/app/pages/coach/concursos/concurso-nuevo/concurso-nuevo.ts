import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { apiError, fieldErrors } from '../../../../core/api';
import {
  CompetitionAccessType,
  CompetitionsApi,
  PenaltyRule,
} from '../../../../core/competitions-api';
import { CoachGroup, TeamsApi } from '../../../../core/teams-api';
import { positiveId } from '../../../../core/team-api';
import { AppHeader } from '../../../../shared/app-header/app-header';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';
import {
  ACCESS_KEY_MAX_BYTES,
  accessKeyValidator,
  buildCreateRequest,
  descriptionValidator,
  durationValidator,
  freezeValidator,
  nameValidator,
  requiredTrimmed,
} from '../concurso-form';

/** Backend field name (`errors` map of the 400 response) to the form control that shows it. */
const BACKEND_FIELDS: Record<string, string> = {
  teamId: 'teamId',
  eventName: 'eventName',
  description: 'description',
  accessType: 'accessType',
  accessKey: 'accessKey',
  penaltyRule: 'penaltyRule',
  scoreboardFreezeMinutes: 'freezeMinutes',
  startsAt: 'startDate',
  endsAt: 'durationMinutes',
};

const MESSAGES: Record<string, Record<string, string>> = {
  teamId: { required: 'Selecciona el grupo del concurso' },
  eventName: {
    required: 'El nombre es obligatorio y debe tener como máximo 150 caracteres',
    maxlength: 'El nombre es obligatorio y debe tener como máximo 150 caracteres',
  },
  description: { maxlength: 'La descripción debe tener como máximo 500 caracteres' },
  accessKey: {
    required: 'La clave de acceso es obligatoria para un concurso privado',
    maxbytes: `La clave de acceso no puede superar ${ACCESS_KEY_MAX_BYTES} bytes`,
  },
  startDate: { required: 'La fecha de inicio es obligatoria' },
  startTime: {
    required: 'La hora de inicio es obligatoria',
    pattern: 'Indica la hora de inicio con el formato HH:mm',
  },
  durationMinutes: { duration: 'La duración debe ser un entero de al menos 1 minuto' },
};

@Component({
  selector: 'app-concurso-nuevo',
  imports: [
    AppHeader,
    SiteFooter,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './concurso-nuevo.html',
  styleUrl: './concurso-nuevo.css',
})
export class ConcursoNuevo implements OnInit {
  private readonly api = inject(CompetitionsApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    teamId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    eventName: new FormControl('', { nonNullable: true, validators: [nameValidator] }),
    description: new FormControl('', { nonNullable: true, validators: [descriptionValidator] }),
    accessType: new FormControl<CompetitionAccessType>('PUBLICO_GRUPO', { nonNullable: true }),
    accessKey: new FormControl('', { nonNullable: true, validators: [accessKeyValidator] }),
    penaltyRule: new FormControl<PenaltyRule>('ICPC_20_MIN', { nonNullable: true }),
    startDate: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    startTime: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, Validators.pattern(/^\d{2}:\d{2}$/)],
    }),
    durationMinutes: new FormControl<number | null>(null, { validators: [durationValidator] }),
    freezeMinutes: new FormControl<number | null>(null, { validators: [freezeValidator] }),
  });

  protected readonly teams = signal<CoachGroup[]>([]);
  protected readonly loadingTeams = signal(false);
  protected readonly teamsError = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  /** Backend errors for fields this form does not have (for example `body`). */
  protected readonly otherErrors = signal<[string, string][]>([]);

  constructor() {
    const controls = this.form.controls;
    // Rules that depend on another field are re-evaluated when that field changes.
    controls.accessType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => controls.accessKey.updateValueAndValidity());
    controls.durationMinutes.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => controls.freezeMinutes.updateValueAndValidity());
    // `endsAt` is derived from the start and the duration: editing the start clears its backend error.
    const clearEnd = () => {
      if (controls.durationMinutes.hasError('backend'))
        controls.durationMinutes.updateValueAndValidity();
    };
    controls.startDate.valueChanges.pipe(takeUntilDestroyed()).subscribe(clearEnd);
    controls.startTime.valueChanges.pipe(takeUntilDestroyed()).subscribe(clearEnd);
  }

  ngOnInit() {
    this.loadTeams();
  }

  protected loadTeams() {
    this.loadingTeams.set(true);
    this.teamsError.set('');
    this.teamsApi
      .loadMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          // Only the coach's published groups: contests are not created for drafts.
          const available = groups.filter(
            (group): group is CoachGroup => 'activeMembers' in group && group.status !== 'BORRADOR',
          );
          this.teams.set(available);
          this.loadingTeams.set(false);
          const requested = positiveId(this.route.snapshot.queryParamMap.get('teamId'));
          const initial =
            available.find((group) => group.groupId === requested) ??
            (available.length === 1 ? available[0] : undefined);
          if (initial && !this.form.controls.teamId.value)
            this.form.controls.teamId.setValue(String(initial.groupId));
        },
        error: () => {
          this.loadingTeams.set(false);
          this.teamsError.set('No se pudieron cargar tus grupos. Reintenta la consulta.');
        },
      });
  }

  /** Message of the first error of a control: the backend's when it rejected the field. */
  protected message(name: keyof ConcursoNuevo['form']['controls']): string {
    const errors = this.form.controls[name].errors;
    if (!errors) return '';
    if (typeof errors['backend'] === 'string') return errors['backend'];
    if (name === 'freezeMinutes') {
      const duration = this.form.controls.durationMinutes.value;
      return Number.isInteger(duration) && (duration as number) >= 1
        ? `Debe ser un entero entre 0 y la duración del concurso (${duration} minutos)`
        : 'Debe ser un entero de 0 o más';
    }
    return MESSAGES[name]?.[Object.keys(errors)[0]] ?? 'Revisa este campo';
  }

  protected submit() {
    if (this.saving()) return;
    this.otherErrors.set([]);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados antes de crear el concurso.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    const request = buildCreateRequest(this.form.getRawValue());
    this.api.create(request).subscribe({
      next: (created) => {
        this.saving.set(false);
        void this.router.navigate(['/coach/concursos'], {
          queryParams: { teamId: request.teamId },
          state: { created: { id: created.id, name: request.eventName } },
        });
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.error.set(apiError(e));
        const others: [string, string][] = [];
        for (const [field, text] of Object.entries(fieldErrors(e))) {
          const name = BACKEND_FIELDS[field];
          const control = name ? this.form.get(name) : null;
          if (control) {
            control.setErrors({ backend: text });
            control.markAsTouched();
          } else others.push([field, text]);
        }
        this.otherErrors.set(others);
      },
    });
  }
}
