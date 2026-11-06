import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { signal } from '@angular/core';
import { Session } from '../../../core/session';
import { TeamsApi } from '../../../core/teams-api';
import { GruposHub } from './grupos-hub';

const base = {
  description: 'Grafos y DP',
  expectedLevel: 'INTERMEDIO',
  maxCapacity: 15,
  sessionSchedule: 'Mar y jue',
  visibility: 'PUBLICO',
};

const PUBLICADOS = [
  { ...base, groupId: 1, name: 'Grafos Avanzados', status: 'ACTIVO' },
  { ...base, groupId: 2, name: 'Otro grupo del catálogo', status: 'ACTIVO' },
];

const MIS_COACH = [
  { ...base, groupId: 1, name: 'Grafos Avanzados', status: 'ACTIVO', invitationCode: 'A1B2C3D4E5F6', activeMembers: 3, pendingRequests: 2 },
  { ...base, groupId: 5, name: 'Borrador de DP', status: 'BORRADOR', invitationCode: 'ZZZZZZZZZZZZ', activeMembers: 0, pendingRequests: 0 },
];

const membership = (status: string, extra = {}) => ({
  membershipId: 1, status, teamRole: 'MIEMBRO', joinedAt: null, leftAt: null, clarification: null, ...extra,
});
const MIS_PRACTICANTE = [
  { ...base, groupId: 1, name: 'Grafos Avanzados', status: 'ACTIVO', membership: membership('ACTIVO') },
  { ...base, groupId: 2, name: 'Otro grupo del catálogo', status: 'ACTIVO', membership: membership('PENDIENTE') },
  { ...base, groupId: 3, name: 'Grupo viejo', status: 'ACTIVO', membership: membership('EXPULSADO') },
];

class TeamsStub {
  readonly mine = signal<unknown[]>([]);
  loadGroups() {
    return of(PUBLICADOS);
  }
  loadMine() {
    return of(this.mine());
  }
  joinByCode() {
    return of({});
  }
  join() {
    return of({});
  }
  respondClarification() {
    return of({});
  }
}

function setup(role: 'COACH' | 'PRACTICANTE', tab: string | null = null) {
  const stub = new TeamsStub();
  stub.mine.set(role === 'COACH' ? MIS_COACH : MIS_PRACTICANTE);
  const params = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
  TestBed.configureTestingModule({
    imports: [GruposHub],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: TeamsApi, useValue: stub },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params.value }, queryParamMap: params } },
    ],
  });
  TestBed.inject(Session).startDemo(role);
  return { stub, params, fixture: TestBed.createComponent(GruposHub) };
}

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const boton = (root: HTMLElement, texto: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(texto));

afterEach(() => TestBed.inject(Session).logout());

describe('Grupos (hub con pestañas)', () => {
  it('ofrece las pestañas Explorar y Mis grupos con un solo h1', async () => {
    const { fixture } = setup('PRACTICANTE');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('h1').length).toBe(1);
    const pestanas = [...root.querySelectorAll('[mat-tab-link], .mdc-tab')].map((t) => t.textContent?.trim());
    expect(pestanas).toEqual(expect.arrayContaining(['Explorar', 'Mis grupos']));
  });

  it('el practicante explora, solicita y puede ingresar con código', async () => {
    const { fixture } = setup('PRACTICANTE');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('¿Tienes un código de invitación?');
    expect(root.textContent).toContain('Grafos Avanzados');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).toBeNull();
  });

  it('el coach explora sin botones de ingreso, ve su grupo como Tuyo y puede crear', async () => {
    const { fixture } = setup('COACH');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Tuyo');
    expect(root.textContent).toContain('Otro grupo del catálogo');
    expect(boton(root, 'Unirme')).toBeUndefined();
    expect(boton(root, 'Solicitar ingreso')).toBeUndefined();
    expect(root.textContent).not.toContain('¿Tienes un código de invitación?');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).not.toBeNull();
    const gestionar = [...root.querySelectorAll('a')].find((a) => a.textContent?.includes('Gestionar'));
    expect(gestionar?.getAttribute('href')).toBe('/coach/grupos/solicitudes?grupo=1');
  });

  it('Mis grupos del practicante separa Activos, Pendientes e Historial', async () => {
    const { fixture } = setup('PRACTICANTE', 'mis-grupos');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Grafos Avanzados');
    expect(root.textContent).not.toContain('Grupo viejo');

    boton(root, 'Pendientes')!.click();
    await settle(fixture);
    expect(root.textContent).toContain('Otro grupo del catálogo');
    expect(root.textContent).not.toContain('Grafos Avanzados');

    boton(root, 'Historial')!.click();
    await settle(fixture);
    expect(root.textContent).toContain('Grupo viejo');
    expect(root.textContent).toContain('Expulsado');
  });

  it('muestra un estado vacío claro en un segmento sin grupos', async () => {
    const { stub, fixture } = setup('PRACTICANTE', 'mis-grupos');
    stub.mine.set([]);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Todavía no eres miembro de ningún grupo');
  });

  it('Mis grupos del coach separa Publicados (con código) de Borradores (con Continuar)', async () => {
    const { fixture } = setup('COACH', 'mis-grupos');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Grafos Avanzados');
    expect(root.textContent).toContain('A1B2C3D4E5F6');
    expect(root.textContent).not.toContain('Borrador de DP');
    const pendientes = [...root.querySelectorAll('a')].find((a) => a.textContent?.includes('2 solicitudes pendientes'));
    expect(pendientes?.getAttribute('href')).toBe('/coach/grupos/solicitudes?grupo=1');
    expect(boton(root, 'Copiar')).toBeDefined();

    boton(root, 'Borradores')!.click();
    await settle(fixture);
    expect(root.textContent).toContain('Borrador de DP');
    expect(root.textContent).not.toContain('A1B2C3D4E5F6');
    const continuar = [...root.querySelectorAll('a')].find((a) => a.textContent?.includes('Continuar'));
    expect(continuar?.getAttribute('href')).toBe('/coach/grupos/crear?borrador=5');
  });
});
