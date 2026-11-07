import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Type, signal } from '@angular/core';
import { of } from 'rxjs';
import { ExplorarGrupos } from './explorar-grupos/explorar-grupos';
import { CrearGrupo } from './crear-grupo/crear-grupo';
import { SolicitudesGrupo } from './solicitudes-grupo/solicitudes-grupo';
import { CoachGroup, CreateGroupRequest, CreateGroupResponse, Membership, TeamsApi } from '../../core/teams-api';

class TeamsStub {
  readonly lastCreated = signal<CreateGroupResponse | null>(null);
  readonly groups = signal([
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
  ]);
  readonly mine = signal<(CoachGroup | unknown)[]>([
    {
      groupId: 1,
      name: 'Entrenamiento de Grafos',
      description: 'Grafos y DP',
      expectedLevel: 'INTERMEDIO',
      maxCapacity: 15,
      sessionSchedule: 'Mar y jue de 19:00 a 21:00',
      status: 'ACTIVO',
      visibility: 'PUBLICO',
      invitationCode: 'A1B2C3D4E5F6',
      activeMembers: 3,
      pendingRequests: 1,
    },
  ]);
  readonly requests = signal<Membership[]>([]);

  readonly calls = {
    join: [] as { groupId: number; code: string }[],
    create: [] as CreateGroupRequest[],
    decide: [] as { id: number; decision: string; message: string }[],
  };

  loadGroups() {
    return of(this.groups());
  }
  loadMine() {
    return of(this.mine());
  }
  join(groupId: number, code = '') {
    this.calls.join.push({ groupId, code });
    return of({ message: 'ok', membershipId: 1, groupId, status: 'PENDIENTE' });
  }
  create(body: CreateGroupRequest) {
    this.calls.create.push(body);
    return of({
      message: 'Grupo creado correctamente',
      groupId: 9,
      name: body.name,
      status: body.draft ? 'BORRADOR' : 'ACTIVO',
      invitationCode: 'CODIGO1234',
    });
  }
  decide(groupId: number, membershipId: number, decision: string, message = '') {
    this.calls.decide.push({ id: membershipId, decision, message });
    return of({ message: 'ok', membershipId, groupId, status: 'ACTIVO' });
  }
  loadRequests() {
    return of([]);
  }
}

const routeStub = {
  snapshot: { queryParamMap: convertToParamMap({}) },
  queryParamMap: of(convertToParamMap({})),
};

function configure<T>(component: Type<T>) {
  const stub = new TeamsStub();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: TeamsApi, useValue: stub },
      { provide: ActivatedRoute, useValue: routeStub },
    ],
  });
  const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { stub, navigation, fixture: TestBed.createComponent(component) };
}

async function settle<T>(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('Interfaces de grupos (US04, US05 y US06)', () => {
  it('muestra los grupos publicados que devuelve la API', async () => {
    const { fixture } = configure(ExplorarGrupos);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Entrenamiento de Grafos');
    expect(root.textContent).toContain('Mostrando 1 grupos');
  });

  it('abre la solicitud y envía el ingreso al grupo elegido', async () => {
    const { stub, fixture } = configure(ExplorarGrupos);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const boton = [...root.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Unirme'),
    );
    expect(boton).toBeTruthy();
    boton!.click();
    await settle(fixture);

    expect(stub.calls.join).toEqual([{ groupId: 1, code: '' }]);
  });

  it('crea un borrador sin exigir nivel ni cupo', async () => {
    const { stub, navigation, fixture } = configure(CrearGrupo);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const nombre = root.querySelector('#grupo-nombre') as HTMLInputElement | null;
    expect(nombre).toBeTruthy();
    nombre!.value = 'Grupo de prueba';
    nombre!.dispatchEvent(new Event('input'));
    await settle(fixture);

    const borrador = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Guardar borrador'),
    );
    expect(borrador).toBeTruthy();
    borrador!.click();
    await settle(fixture);

    expect(stub.calls.create.length).toBe(1);
    expect(stub.calls.create[0].draft).toBe(true);
    expect(stub.calls.create[0].name).toBe('Grupo de prueba');
    expect(stub.lastCreated()).toMatchObject({ name: 'Grupo de prueba', status: 'BORRADOR' });
    expect(navigation).toHaveBeenCalledWith(['/coach/grupos/creado']);
  });

  it('lista las solicitudes pendientes del grupo del coach', async () => {
    const { stub, fixture } = configure(SolicitudesGrupo);
    stub.requests.set([
      {
        membershipId: 101,
        groupId: 1,
        status: 'PENDIENTE',
        requestedAt: '2026-11-02T18:20:00-05:00',
        practitioner: {
          fullName: 'Ana Prueba',
          studentCode: 'U2020001',
          career: 'Ingeniería de Software',
          academicCycle: 5,
          competitiveLevel: 'INTERMEDIO',
          codeforcesHandle: 'ana_prueba',
          codeforcesRating: 1520,
          atcoderHandle: null,
          vjudgeHandle: null,
        },
      },
    ]);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ana Prueba');
    expect(root.textContent).toContain('U2020001');
  });

  it('acepta una solicitud con la decisión ACEPTAR', async () => {
    const { stub, fixture } = configure(SolicitudesGrupo);
    stub.requests.set([
      {
        membershipId: 101,
        groupId: 1,
        status: 'PENDIENTE',
        requestedAt: '2026-11-02T18:20:00-05:00',
        practitioner: {
          fullName: 'Ana Prueba',
          studentCode: 'U2020001',
          career: 'Ingeniería de Software',
          academicCycle: 5,
          competitiveLevel: 'INTERMEDIO',
          codeforcesHandle: null,
          codeforcesRating: null,
          atcoderHandle: null,
          vjudgeHandle: null,
        },
      },
    ]);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const revisar = [...root.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Revisar',
    );
    revisar!.click();
    await settle(fixture);

    const aceptar = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Aceptar solicitud',
    );
    expect(aceptar).toBeTruthy();
    aceptar!.click();
    await settle(fixture);

    expect(stub.calls.decide).toEqual([{ id: 101, decision: 'ACEPTAR', message: '' }]);
  });
});
