import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Router, provideRouter } from '@angular/router';
import { Session } from '../../core/session';
import { UserMenu } from './user-menu';

@Component({ template: '' })
class LoginStub {}

describe('UserMenu', () => {
  async function open(role: 'PRACTICANTE' | 'COACH') {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', component: LoginStub }]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(Session).demo.set(role);
    const fixture = TestBed.createComponent(UserMenu);
    fixture.componentRef.setInput('coach', role === 'COACH');
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Abrir menú de usuario"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const items = Array.from(overlay.querySelectorAll('.mat-mdc-menu-item')).map((el) => el.textContent?.trim());
    return { fixture, overlay, items };
  }

  afterEach(() => TestBed.inject(Session).logout());

  it('puts progress, ranking, platforms and the profile pages in the practitioner dropdown', async () => {
    const { overlay, items } = await open('PRACTICANTE');
    expect(items).toEqual(expect.arrayContaining([
      'Progreso por tema', 'Progreso por equipo', 'Ranking', 'Plataformas competitivas',
      'Mi perfil', 'Editar perfil', 'Ajustes generales', 'Salir de la demo',
    ]));
    expect(overlay.querySelector('a[href="/ranking"]')).not.toBeNull();
    expect(overlay.querySelector('a[href="/progreso"]')).not.toBeNull();
    expect(overlay.querySelector('a[href="/progreso/equipos"]')).not.toBeNull();
    expect(items).not.toContain('Seguimiento de grupos');
    expect(items).not.toContain('Abrir navegación');
  });

  it('puts group follow-up, performance and ranking in the coach dropdown', async () => {
    const { items, overlay } = await open('COACH');
    expect(items).toEqual(expect.arrayContaining(['Seguimiento de grupos', 'Rendimiento', 'Mi perfil', 'Editar perfil']));
    expect(items).toContain('Ranking');
    expect(overlay.querySelector('a[href="/coach/ranking"]')).not.toBeNull();
  });

  it('keeps the header links reachable below the xl breakpoint', async () => {
    const { overlay } = await open('PRACTICANTE');
    const hiddenOnXl = Array.from(overlay.querySelectorAll('.mat-mdc-menu-item.xl\\:hidden')).map((el) => el.textContent?.trim());
    expect(hiddenOnXl).toEqual(['Inicio', 'Problemas', 'Concursos', 'Grupos', 'Recursos']);
  });

  it('shows the account header with the role', async () => {
    const { overlay } = await open('PRACTICANTE');
    expect(overlay.querySelector('[role="note"]')?.textContent).toContain('Practicante');
  });

  it('closes the session and goes to the login page', async () => {
    const { fixture, overlay } = await open('PRACTICANTE');
    const logout = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button.mat-mdc-menu-item'))
      .find((button) => button.textContent?.includes('Salir de la demo'))!;
    logout.click();
    await fixture.whenStable();
    expect(TestBed.inject(Session).demo()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
