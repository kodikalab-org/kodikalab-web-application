import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TeamPage } from './team-page';
@Component({
  selector: 'app-team-frame',
  imports: [RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: ` <div class="relative isolate min-h-dvh overflow-clip bg-kl-bg font-body text-kl-text">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[url('/images/progreso-ranking/fondo.svg')] bg-size-[1440px_900px] bg-position-[right_top] bg-no-repeat"
    ></div>
    <header class="border-b border-kl-border bg-kl-bg/80 px-4 py-4 lg:px-14">
      <nav
        aria-label="Navegación principal"
        class="mx-auto flex max-w-[1328px] flex-wrap items-center gap-5 text-sm"
      >
        <a
          [routerLink]="coach() ? '/coach/inicio' : '/inicio'"
          class="mr-auto flex items-center gap-2 font-display text-xl font-bold"
          ><img src="/images/progreso-ranking/logo-movil.svg" alt="" />Kodikalab</a
        >
        <a
          [routerLink]="coach() ? '/coach/ranking' : '/ranking'"
          [queryParams]="{ teamId: page().teamId() }"
          >Ranking</a
        >
        @if (coach()) {
          <a routerLink="/coach/rendimiento" [queryParams]="{ teamId: page().teamId() }"
            >Rendimiento</a
          ><a routerLink="/coach/competencias" [queryParams]="{ teamId: page().teamId() }"
            >Competencias</a
          >
        } @else {
          <a routerLink="/progreso/equipos" [queryParams]="{ teamId: page().teamId() }"
            >Mi avance</a
          >
        }
        <a [routerLink]="coach() ? '/coach/perfil' : '/perfil'" aria-label="Ver perfil">Perfil</a>
      </nav>
    </header>
    <main class="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 lg:py-8">
      <div>
        <p class="font-mono text-xs text-kl-muted">Inicio / Mi espacio</p>
        <h1 class="m-0 font-display text-2xl font-bold lg:text-[40px]">{{ title() }}</h1>
        <p class="text-kl-muted">{{ description() }}</p>
      </div>
      <form
        [formGroup]="page().context"
        (ngSubmit)="page().selectTeam()"
        class="flex flex-wrap items-start gap-3"
      >
        <mat-form-field appearance="outline"
          ><mat-label>ID del equipo</mat-label
          ><input
            matInput
            formControlName="teamId"
            inputmode="numeric"
            [readonly]="page().saving()"
        /></mat-form-field>
        <button mat-flat-button type="submit" [disabled]="page().saving()">Consultar equipo</button>
        <button
          mat-stroked-button
          type="button"
          (click)="page().reload()"
          [disabled]="!page().teamId() || page().busy() || page().saving()"
        >
          Reintentar consulta
        </button>
      </form>
      @if (!page().teamId()) {
        <p role="status" class="rounded-xl border border-kl-border p-4">
          Selecciona un contexto de equipo válido. Esta versión de la API no lista equipos; puedes
          recibir teamId desde la navegación o introducir su ID real.
        </p>
      }
      @if (page().busy()) {
        <p role="status" aria-live="polite">Consultando información del equipo…</p>
      }
      @if (page().error()) {
        <section role="alert" class="rounded-xl border border-amber-400 bg-kl-surface p-4">
          <strong>{{ page().error() }}</strong>
          <ul>
            @for (field of page().fields(); track field[0]) {
              <li>{{ field[0] }}: {{ field[1] }}</li>
            }
          </ul>
        </section>
      }
      @if (page().message()) {
        <p role="status" aria-live="polite" class="rounded-xl border border-kl-accent p-4">
          {{ page().message() }}
        </p>
      }
      <ng-content />
    </main>
    <footer class="mt-8 border-t border-kl-border p-6 text-center text-sm text-kl-muted">
      KodikaLab · Entrenamiento en equipo
    </footer>
  </div>`,
})
export class TeamFrame {
  readonly page = input.required<TeamPage>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly coach = input(false);
}
