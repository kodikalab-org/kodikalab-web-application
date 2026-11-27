import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, Subject, tap, throwError } from 'rxjs';
import { Membership, TeamsApi } from '../../core/teams-api';
import { CrearGrupo } from './crear-grupo/crear-grupo';
import { ExplorarGrupos } from './explorar-grupos/explorar-grupos';
import { GrupoDetalle } from './grupo-detalle/grupo-detalle';
import { SolicitudesGrupo } from './solicitudes-grupo/solicitudes-grupo';

const GROUP = {
  groupId: 1, name: 'Equipo Alfa', description: null, expectedLevel: 'INTERMEDIO', maxCapacity: 1,
  sessionSchedule: null, status: 'ACTIVO', visibility: 'PUBLICO',
};
const COACH_GROUP = { ...GROUP, invitationCode: 'A1B2C3D4E5F6', activeMembers: 1, pendingRequests: 1 };
const request = (membershipId: number, fullName?: string) =>
  ({
    membershipId, groupId: 1, status: 'PENDIENTE', requestedAt: '2026-11-02T18:20:00-05:00',
    ...(fullName
      ? { practitioner: { fullName, studentCode: 'U1', career: 'Software', academicCycle: 5, competitiveLevel: 'INTERMEDIO', codeforcesHandle: null, codeforcesRating: null, atcoderHandle: null, vjudgeHandle: null } }
      : {}),
  }) as Membership;

function stubApi() {
  const requests = signal<Membership[]>([]);
  const mine = signal<unknown[]>([]);
  return {
    requests,
    mine,
    lastCreated: signal(null),
    loadGroups: vi.fn((): Observable<unknown[]> => of([GROUP])),
    loadMine: vi.fn((): Observable<unknown[]> => of([COACH_GROUP]).pipe(tap((v) => mine.set(v)))),
    loadRequests: vi.fn((): Observable<Membership[]> => of([])),
    assignedProblems: vi.fn((): Observable<unknown> => of({ items: [] })),
    decide: vi.fn((): Observable<unknown> => of({ message: 'ok' })),
    create: vi.fn((): Observable<unknown> => of({})),
  };
}
type Stub = ReturnType<typeof stubApi>;
const answering = (stub: Stub, source: Observable<Membership[]>) =>
  source.pipe(tap((list) => stub.requests.set(list)));

function render<T>(component: Type<T>, stub: Stub, query: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: TeamsApi, useValue: stub },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(query), paramMap: convertToParamMap({ id: '1' }) },
          queryParamMap: of(convertToParamMap(query)),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(component);
  const root = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const text = () => root.textContent!.replace(/\s+/g, ' ');
  const button = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  return { fixture, root, settle, text, button };
}
const failure = () => throwError(() => new Error('down'));

describe('Join requests resilience', () => {
  it('shows loading instead of a false empty state while the groups load', async () => {
    const stub = stubApi();
    stub.loadMine.mockReturnValue(new Subject<unknown[]>());
    const { settle, text } = render(SolicitudesGrupo, stub);
    await settle();
    expect(text()).toContain('Cargando tus grupos');
    expect(text()).not.toContain('Todavía no tienes grupos');
  });

  it('offers a retry when the groups cannot be loaded', async () => {
    const stub = stubApi();
    stub.loadMine.mockReturnValueOnce(failure());
    const { settle, text, button } = render(SolicitudesGrupo, stub);
    await settle();
    expect(text()).not.toContain('Todavía no tienes grupos');
    button('Reintentar').click();
    await settle();
    expect(stub.loadMine).toHaveBeenCalledTimes(2);
    expect(text()).toContain('1 / 1 integrante ·');
  });

  it('drops the previous rows and ignores late answers when the status changes', async () => {
    const stub = stubApi();
    const slow = new Subject<Membership[]>();
    const late = new Subject<Membership[]>();
    stub.loadRequests
      .mockImplementationOnce(() => answering(stub, of([request(1, 'Ana Prueba')])))
      .mockImplementationOnce(() => answering(stub, slow))
      .mockImplementationOnce(() => answering(stub, late));
    const { settle, text, fixture } = render(SolicitudesGrupo, stub);
    await settle();
    const component = fixture.componentInstance as unknown as { cambiarEstado(s: string): void };
    component.cambiarEstado('ACTIVO');
    await settle();
    expect(text()).not.toContain('Ana Prueba');
    expect(text()).toContain('Cargando solicitudes');
    component.cambiarEstado('EXPULSADO');
    late.next([]);
    slow.next([request(2, 'Respuesta Tardía')]);
    await settle();
    expect(text()).not.toContain('Respuesta Tardía');
    expect(text()).toContain('No hay integrantes expulsados');
  });

  it('shows an error with retry instead of an empty list when requests fail', async () => {
    const stub = stubApi();
    stub.loadRequests.mockReturnValueOnce(failure());
    const { settle, text, button } = render(SolicitudesGrupo, stub);
    await settle();
    expect(text()).not.toContain('No hay solicitudes en este estado');
    button('Reintentar').click();
    await settle();
    expect(text()).toContain('No hay solicitudes en este estado');
  });

  it('shows a failed decision inside the open dialog', async () => {
    const stub = stubApi();
    stub.loadRequests.mockImplementation(() => answering(stub, of([request(1, 'Ana Prueba')])));
    stub.decide.mockReturnValue(failure());
    const { settle, root, button } = render(SolicitudesGrupo, stub);
    await settle();
    button('Revisar').click();
    await settle();
    button('Aceptar solicitud').click();
    await settle();
    expect(root.querySelector('[role="dialog"] [role="alert"]')).not.toBeNull();
  });

  it('does not render holes when the applicant profile is missing', async () => {
    const stub = stubApi();
    stub.loadRequests.mockImplementation(() => answering(stub, of([request(1)])));
    const { settle, text } = render(SolicitudesGrupo, stub);
    await settle();
    expect(text()).toContain('Datos del perfil no disponibles');
    expect(text()).not.toContain('· ciclo');
  });
});

describe('Group detail resilience', () => {
  it('does not claim there are no problems while they load', async () => {
    const stub = stubApi();
    stub.assignedProblems.mockReturnValue(new Subject());
    const { settle, text } = render(GrupoDetalle, stub);
    await settle();
    expect(text()).toContain('Cargando problemas');
    expect(text()).not.toContain('todavía no asignó problemas');
  });

  it('retries failed problems', async () => {
    const stub = stubApi();
    stub.assignedProblems.mockReturnValueOnce(failure());
    const { settle, text, button } = render(GrupoDetalle, stub);
    await settle();
    button('Reintentar').click();
    await settle();
    expect(text()).toContain('todavía no asignó problemas');
  });

  it('retries a failed group load', async () => {
    const stub = stubApi();
    stub.loadGroups.mockReturnValueOnce(failure());
    const { settle, text, button } = render(GrupoDetalle, stub);
    await settle();
    button('Reintentar').click();
    await settle();
    expect(text()).toContain('Equipo Alfa');
  });

  it('writes the capacity and level in Spanish', async () => {
    const { settle, text } = render(GrupoDetalle, stubApi());
    await settle();
    expect(text()).toMatch(/Cupos*1 integrante/);
    expect(text()).not.toContain('1 integrantes');
    expect(text()).toContain('Intermedio');
  });

  it('does not append the noun to an undefined capacity', async () => {
    const stub = stubApi();
    stub.loadGroups.mockReturnValue(of([{ ...GROUP, maxCapacity: null }]));
    const { settle, text } = render(GrupoDetalle, stub);
    await settle();
    expect(text()).not.toContain('Sin definir integrantes');
  });
});

describe('Explore groups resilience', () => {
  it('writes a single result in singular', async () => {
    const { settle, text } = render(ExplorarGrupos, stubApi());
    await settle();
    expect(text()).toContain('Mostrando 1 grupo');
    expect(text()).not.toContain('Mostrando 1 grupos');
  });

  it('warns and retries when the memberships cannot be loaded', async () => {
    const stub = stubApi();
    stub.loadMine.mockReturnValueOnce(failure());
    const { settle, text, button } = render(ExplorarGrupos, stub);
    await settle();
    expect(text()).toContain('No pudimos comprobar tu participación');
    button('Reintentar').click();
    await settle();
    expect(text()).not.toContain('No pudimos comprobar tu participación');
  });
});

describe('Create group form', () => {
  const type = (root: HTMLElement, selector: string, value: string) => {
    const input = root.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('counts the typed characters', async () => {
    const { root, settle, text } = render(CrearGrupo, stubApi());
    await settle();
    type(root, '#grupo-nombre', 'Grafos');
    type(root, '#grupo-descripcion', 'DP');
    await settle();
    expect(text()).toContain('6/120');
    expect(text()).toContain('2/500');
  });

  it('reviews the schedule and data that will really be saved', async () => {
    const stub = stubApi();
    stub.loadMine.mockReturnValue(
      of([{ ...COACH_GROUP, groupId: 5, status: 'BORRADOR', sessionSchedule: 'Lun, Vie de 08:00 a 09:30', description: null }]),
    );
    const { settle, text } = render(CrearGrupo, stub, { borrador: '5', paso: '4' });
    await settle();
    expect(text()).toContain('Lun, Vie de 08:00 a 09:30');
    expect(text()).not.toContain('Martes y jueves');
    expect(text()).not.toContain('Preparación para competencias ICPC');
    expect(text()).not.toContain('maqueta');
  });

  it('does not create a duplicate while a draft is loading or after it fails to load', async () => {
    const stub = stubApi();
    const pending = new Subject<unknown[]>();
    stub.loadMine.mockReturnValueOnce(pending);
    const { root, settle, text, button, fixture } = render(CrearGrupo, stub, { borrador: '5' });
    await settle();
    type(root, '#grupo-nombre', 'Grafos');
    const component = fixture.componentInstance as unknown as { guardarBorrador(): void };
    component.guardarBorrador();
    pending.error(new Error('down'));
    await settle();
    component.guardarBorrador();
    expect(stub.create).not.toHaveBeenCalled();
    expect(text()).toContain('No pudimos cargar tu borrador');
    stub.loadMine.mockReturnValue(of([{ ...COACH_GROUP, groupId: 5, status: 'BORRADOR' }]));
    button('Reintentar').click();
    await settle();
    expect(text()).toContain('Estás continuando un borrador');
  });
});
