import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { ExplorarGrupos } from './explorar-grupos';
import { TeamsApi } from '../../../core/teams-api';

const GRUPOS = [
  {
    groupId: 1,
    name: 'Entrenamiento de Grafos',
    description: 'Grafos y DP',
    expectedLevel: 'INTERMEDIO',
    maxCapacity: 15,
    sessionSchedule: 'Mar y jue de 19:00 a 21:00',
    status: 'ACTIVO' as const,
    visibility: 'PUBLICO' as const,
  },
  {
    groupId: 2,
    name: 'Training ICPC',
    description: 'Preparación para regionales',
    expectedLevel: 'AVANZADO',
    maxCapacity: 10,
    sessionSchedule: 'Sábados',
    status: 'ACTIVO' as const,
    visibility: 'PROTEGIDO' as const,
  },
];

class TeamsStub {
  joinByCodeResult: () => Observable<unknown> = () =>
    of({ message: 'Ingresaste al grupo', membershipId: 7, groupId: 2, status: 'ACTIVO' });
  readonly calls = { joinByCode: [] as string[], join: [] as number[] };
  loadGroups() {
    return of(GRUPOS);
  }
  loadMine() {
    return of([]);
  }
  join(groupId: number) {
    this.calls.join.push(groupId);
    return of({ message: 'ok', membershipId: 1, groupId, status: 'PENDIENTE' });
  }
  joinByCode(code: string) {
    this.calls.joinByCode.push(code);
    return this.joinByCodeResult();
  }
  respondClarification() {
    return of({});
  }
}

function setup() {
  const stub = new TeamsStub();
  TestBed.configureTestingModule({
    imports: [ExplorarGrupos],
    providers: [
      provideRouter([]),
      { provide: TeamsApi, useValue: stub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, queryParamMap: of(convertToParamMap({})) },
      },
    ],
  });
  return { stub, fixture: TestBed.createComponent(ExplorarGrupos) };
}

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function escribir(input: HTMLInputElement, valor: string) {
  input.value = valor;
  input.dispatchEvent(new Event('input'));
}

describe('Explorar grupos', () => {
  it('sigue filtrando por texto y por nivel como antes', async () => {
    const { fixture } = setup();
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Mostrando 2 grupos');

    escribir(root.querySelector('#buscar-grupos') as HTMLInputElement, 'grafos');
    await settle(fixture);
    expect(root.textContent).toContain('Mostrando 1 grupos');
    expect(root.textContent).toContain('Entrenamiento de Grafos');
    expect(root.textContent).not.toContain('Training ICPC');

    escribir(root.querySelector('#buscar-grupos') as HTMLInputElement, '');
    const avanzado = [...root.querySelectorAll('mat-checkbox')].find((c) => c.textContent?.includes('Avanzado'));
    (avanzado!.querySelector('input') as HTMLInputElement).click();
    await settle(fixture);
    expect(root.textContent).toContain('Mostrando 1 grupos');
    expect(root.textContent).toContain('Training ICPC');

    const visibilidad = [...root.querySelectorAll('mat-checkbox')].find((c) => c.textContent?.includes('Público'));
    (visibilidad!.querySelector('input') as HTMLInputElement).click();
    await settle(fixture);
    expect(root.textContent).toContain('Mostrando 0 grupos');
  });

  it('pasa el código a mayúsculas, lo valida en vivo y ingresa por código', async () => {
    const { stub, fixture } = setup();
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('¿Tienes un código de invitación?');

    const input = root.querySelector('#codigo-invitacion') as HTMLInputElement;
    const enviar = () => [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Ingresar al grupo'))!;
    expect(input.maxLength).toBe(12);
    expect(enviar().disabled).toBe(true);

    escribir(input, 'ab12cd34');
    await settle(fixture);
    expect(input.value).toBe('AB12CD34');
    expect(enviar().disabled).toBe(true);
    expect(root.textContent).toContain('8/12');

    escribir(input, 'ab12cd34ef56');
    await settle(fixture);
    expect(input.value).toBe('AB12CD34EF56');
    expect(enviar().disabled).toBe(false);

    enviar().click();
    await settle(fixture);
    expect(stub.calls.joinByCode).toEqual(['AB12CD34EF56']);
    expect(stub.calls.join).toEqual([]);
    expect(root.textContent).toContain('Ingresaste al grupo');
  });

  it('muestra un mensaje claro cuando el código no existe', async () => {
    const { stub, fixture } = setup();
    stub.joinByCodeResult = () =>
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'El código de invitación no es válido' } }));
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    escribir(root.querySelector('#codigo-invitacion') as HTMLInputElement, 'ZZZZZZZZZZZZ');
    await settle(fixture);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Ingresar al grupo'))!.click();
    await settle(fixture);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no es válido');
  });
});
