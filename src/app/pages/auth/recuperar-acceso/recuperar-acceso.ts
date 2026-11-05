import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Clipboard } from '@angular/cdk/clipboard';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../../core/session';
import { ProfileApi } from '../../../core/profile-api';
import { apiError } from '../../../core/api';

@Component({
  selector: 'app-recuperar-acceso',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatToolbarModule],
  templateUrl: './recuperar-acceso.html', styleUrl: './recuperar-acceso.css',
})
export class RecuperarAcceso {
  private readonly session = inject(Session);
  private readonly profiles = inject(ProfileApi);
  private readonly clipboard = inject(Clipboard);
  protected busy = false;
  protected error = '';
  protected code = '';
  protected showPassword = false;
  protected copyStatus = '';
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(100)] }),
    recoveryCode: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(64)] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^(?=.*\p{Lu})(?=.*\p{Nd})[\s\S]{8,}$/u)] }),
  });
  protected async recuperar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    const { email, recoveryCode, newPassword } = this.form.getRawValue();
    try {
      const result = await firstValueFrom(this.session.recover(email, recoveryCode, newPassword));
      this.profiles.reset();
      this.code = result.recoveryCode;
      this.form.reset();
    } catch (error) { this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected copiar(): void {
    this.copyStatus = this.clipboard.copy(this.code) ? 'Código copiado' : 'No se pudo copiar. Cópialo manualmente.';
  }
}
