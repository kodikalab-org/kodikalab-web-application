import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { A11yModule } from '@angular/cdk/a11y';
import { Clipboard } from '@angular/cdk/clipboard';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../core/session';
import { apiError } from '../../core/api';

@Component({
  selector: 'app-recovery-code',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, A11yModule],
  templateUrl: './recovery-code.html', styleUrl: './recovery-code.css',
})
export class RecoveryCode {
  private readonly session = inject(Session);
  private readonly clipboard = inject(Clipboard);
  protected open = false;
  protected busy = false;
  protected code = '';
  protected error = '';
  protected copied = '';
  protected readonly form = new FormGroup({ password: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  protected cerrar(): void { this.open = false; this.code = ''; this.error = ''; this.copied = ''; this.form.reset(); }
  protected async mostrar(): Promise<void> {
    if (this.form.invalid || this.busy) return;
    if (this.session.demo()) { this.error = 'La demo no contiene códigos de recuperación reales.'; return; }
    this.busy = true;
    this.error = '';
    try {
      const result = await firstValueFrom(this.session.recoveryCode(this.form.controls.password.value));
      // Do not reveal a late response after closing the dialog.
      if (this.open) this.code = result.recoveryCode;
      this.form.reset();
    } catch (error) { if (this.open) this.error = apiError(error); }
    finally { this.busy = false; }
  }
  protected copiar(): void { this.copied = this.clipboard.copy(this.code) ? 'Código copiado' : 'No se pudo copiar. Cópialo manualmente.'; }
}
