import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { firstValueFrom } from 'rxjs';
import { ProfileApi } from '../../../../core/profile-api';
import { Session } from '../../../../core/session';
import { apiError } from '../../../../core/api';
import { SiteFooter } from '../../../../shared/site-footer/site-footer';

@Component({
  selector: 'app-onboarding-presentacion',
  imports: [
    SiteFooter,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './presentacion.html',
  styleUrl: './presentacion.css',
})
export class OnboardingPresentacion {
  protected readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);
  protected busy = false;
  /** Resumen del borrador de la pantalla anterior, para la vista previa del perfil. */
  protected get resumen(): string {
    const { especialidad, organizacion, anios } = this.profiles.coach;
    return ['Coach', especialidad, organizacion, anios === null ? '' : `${anios} años`].filter(Boolean).join(' · ');
  }
  protected error = '';
  protected async guardar(omitir = false): Promise<void> {
    if (this.busy || (!omitir && this.form.invalid)) return;
    const draft = this.profiles.coach;
    if (!draft.especialidad || draft.anios === null) { await this.router.navigateByUrl('/onboarding/coach/experiencia'); return; }
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.profiles.save({ especialidadPrincipal: draft.especialidad,
        organizacionClub: draft.organizacion || null, aniosExperiencia: draft.anios,
        presentacion: omitir ? null : this.form.controls.presentacion.value || null }));
      await this.router.navigateByUrl('/onboarding/coach/completado');
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected readonly form = new FormGroup({
    presentacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
}
