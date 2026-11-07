import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CompetitionStatus } from '../../../../core/competitions-api';

export interface ConfirmStatusData {
  name: string;
  target: CompetitionStatus;
}

/** Confirmation before moving a contest to its next status (`true` when confirmed). */
@Component({
  selector: 'app-confirmar-estado-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ target === 'EN_CURSO' ? 'Iniciar concurso' : 'Finalizar concurso' }}</h2>
    <mat-dialog-content>
      @if (target === 'EN_CURSO') {
        <p>
          ¿Iniciar «{{ data.name }}» ahora? El concurso pasará a <strong>En curso</strong>.
        </p>
      } @else {
        <p>
          ¿Finalizar «{{ data.name }}»? El concurso pasará a <strong>Finalizada</strong> y no se
          podrá reabrir.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true" cdkFocusInitial>
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarEstadoDialog {
  protected readonly data = inject<ConfirmStatusData>(MAT_DIALOG_DATA);
  protected readonly target = this.data.target;
}
