import { TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Type, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable, Subject, of, tap, throwError } from 'rxjs';
import { ExplorarGrupos } from './explorar-grupos/explorar-grupos';
import { CrearGrupo } from './crear-grupo/crear-grupo';
import { GrupoCreado } from './grupo-creado/grupo-creado';
import { SolicitudesGrupo } from './solicitudes-grupo/solicitudes-grupo';
import { SeguimientoGrupo } from './seguimiento-grupo/seguimiento-grupo';
import {
  CoachGroup,
  CreateGroupRequest,
  CreateGroupResponse,
  JoinGroupResponse,
  Membership,
  ReviewMembershipResponse,
  TeamsApi,
} from '../../core/teams-api';

const CREADO: CreateGroupResponse = {
  message: 'Grupo creado correctamente',
  groupId: 9,
  name: 'Grafos',
  invitationCode: 'CODIGO1234AB',
};

class TeamsStub {
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
  readonly lastCreated = signal<CreateGroupResponse | null>(null);

  readonly calls = {
    join: [] as { groupId: number; code: string }[],
    create: [] as CreateGroupRequest[],
    decide: [] as { id: number; decision: string }[],
    loadRequests: [] as number[],
    loadGroups: 0,
    loadMine: 0,
  };

  /** Respuestas programables: cada prueba reemplaza la que necesita. */
  createResult: () => Observable<CreateGroupResponse> = () => of(CREADO);

  groupsResult: () => Observable<unknown[]> = () => of(this.groups());
  mineResult: () => Observable<unknown[]> = () => of(this.mine());
  joinResult: (groupId: number, code: string) => Observable<JoinGroupResponse> = (groupId) =>
    of({ message: 'ok', membershipId: 1, groupId, status: 'PENDIENTE' });

  loadGroups() {
    this.calls.loadGroups++;
    return this.groupsResult();
  }
  loadMine() {
    this.calls.loadMine++;
    return this.mineResult();
  }
  join(groupId: number, code = '') {
    this.calls.join.push({ groupId, code });
    return this.joinResult(groupId, code);
  }
  create(body: CreateGroupRequest) {
    this.calls.create.push(body);
    return this.createResult().pipe(tap((response) => this.lastCreated.set(response)));
  }
  requestsResult: () => Observable<Membership[]> = () => of(this.requests());
  decideResult: (membershipId: number, decision: string) => Observable<ReviewMembershipResponse> = (
    membershipId,
  ) => of({ message: 'Solicitud aceptada', membershipId, groupId: 1, status: 'ACTIVO' });

  decide(groupId: number, membershipId: number, decision: string) {
    this.calls.decide.push({ id: membershipId, decision });
    return this.decideResult(membershipId, decision).pipe(
      tap(() =>
        this.requests.update((lista) => lista.filter((item) => item.membershipId !== membershipId)),
      ),
    );
  }
  loadRequests(groupId: number) {
    this.calls.loadRequests.push(groupId);
    return this.requestsResult().pipe(tap((lista) => this.requests.set(lista)));
  }
}

const routeStub = {
  snapshot: { queryParamMap: convertToParamMap({}) },
  queryParamMap: of(convertToParamMap({})),
};

function configure<T>(
  component: Type<T>,
  providers: unknown[] = [],
  prepare?: (stub: TeamsStub) => void,
) {
  const stub = new TeamsStub();
  prepare?.(stub);
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: TeamsApi, useValue: stub },
      { provide: ActivatedRoute, useValue: routeStub },
      ...(providers as never[]),
    ],
  });
  return { stub, fixture: TestBed.createComponent(component) };
}

async function settle<T>(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function httpError(status: number, body: unknown = null) {
  return new HttpErrorResponse({ status, error: body });
}

function botones(root: HTMLElement) {
  return [...root.querySelectorAll('button')];
}

function boton(root: HTMLElement, texto: string) {
  return botones(root).find((b) => b.textContent?.trim().includes(texto));
}

interface CrearInternals {
  general: FormGroup;
  horario: FormGroup;
  acceso: FormGroup;
  paso(): number;
  pasoMaximo(): number;
  error(): string;
  sinPermiso(): boolean;
  guardando(): boolean;
  continuar(): void;
  irAtras(): void;
  pasoConError(paso: number): boolean;
  pasoValido(paso: number): boolean;
}

describe('Crear grupo (US04)', () => {
  function abrir() {
    const { stub, fixture } = configure(CrearGrupo);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const crear = fixture.componentInstance as unknown as CrearInternals;
    const root = fixture.nativeElement as HTMLElement;
    return { stub, fixture, crear, root, navegar };
  }

  /** Completa los tres formularios con datos válidos. */
  function llenar(crear: CrearInternals) {
    crear.general.setValue({
      nombre: '  Entrenamiento de Grafos  ',
      descripcion: ' Preparación ICPC ',
      nivel: 'INTERMEDIO',
      cupo: 15,
    });
    crear.horario.setValue({ dias: ['Jue', 'Mar'], inicio: '19:00', fin: '21:00' });
    crear.acceso.setValue({ visibilidad: 'PROTEGIDO' });
  }

  async function irAlResumen(
    fixture: { detectChanges(): void; whenStable(): Promise<unknown> },
    crear: CrearInternals,
  ) {
    for (let i = 0; i < 3; i++) {
      crear.continuar();
      await settle(fixture);
    }
    expect(crear.paso()).toBe(4);
  }

  describe('validaciones del contrato', () => {
    it('exige el nombre, ignora espacios y limita a 120 caracteres', () => {
      const { crear } = abrir();
      const nombre = crear.general.controls['nombre'];

      expect(nombre.hasError('required')).toBe(true);
      nombre.setValue('     ');
      expect(nombre.hasError('required')).toBe(true);
      nombre.setValue(`  ${'a'.repeat(120)}  `);
      expect(nombre.valid).toBe(true);
      nombre.setValue('a'.repeat(121));
      expect(nombre.hasError('maxlength')).toBe(true);
    });

    it('limita la descripción a 500 caracteres y la deja opcional', () => {
      const { crear } = abrir();
      const descripcion = crear.general.controls['descripcion'];

      expect(descripcion.valid).toBe(true);
      descripcion.setValue('d'.repeat(500));
      expect(descripcion.valid).toBe(true);
      descripcion.setValue('d'.repeat(501));
      expect(descripcion.hasError('maxlength')).toBe(true);
    });

    it('exige un nivel del enum PRINCIPIANTE, INTERMEDIO o AVANZADO', () => {
      const { crear } = abrir();
      const nivel = crear.general.controls['nivel'];

      expect(nivel.hasError('required')).toBe(true);
      nivel.setValue('Experto');
      expect(nivel.hasError('opcion')).toBe(true);
      for (const valor of ['PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO']) {
        nivel.setValue(valor);
        expect(nivel.valid).toBe(true);
      }
    });

    it('exige un cupo entero entre 1 y 1000', () => {
      const { crear } = abrir();
      const cupo = crear.general.controls['cupo'];

      expect(cupo.hasError('required')).toBe(true);
      cupo.setValue(0);
      expect(cupo.hasError('min')).toBe(true);
      cupo.setValue(1001);
      expect(cupo.hasError('max')).toBe(true);
      cupo.setValue(7.5);
      expect(cupo.hasError('entero')).toBe(true);
      for (const valor of [1, 1000]) {
        cupo.setValue(valor);
        expect(cupo.valid).toBe(true);
      }
    });

    it('exige al menos un día y una hora de inicio anterior a la de fin', () => {
      const { crear } = abrir();

      expect(crear.horario.controls['dias'].hasError('required')).toBe(true);
      expect(crear.horario.controls['inicio'].hasError('required')).toBe(true);
      expect(crear.horario.controls['fin'].hasError('required')).toBe(true);

      crear.horario.setValue({ dias: ['Mar'], inicio: '21:00', fin: '19:00' });
      expect(crear.horario.hasError('orden')).toBe(true);
      crear.horario.setValue({ dias: ['Mar'], inicio: '19:00', fin: '19:00' });
      expect(crear.horario.hasError('orden')).toBe(true);
      crear.horario.setValue({ dias: ['Mar'], inicio: '19:00', fin: '21:00' });
      expect(crear.horario.valid).toBe(true);
    });

    it('rechaza un horario cuyo texto generado supere los 150 caracteres', () => {
      const { crear } = abrir();

      crear.horario.setValue({
        dias: ['x'.repeat(80), 'y'.repeat(80)],
        inicio: '19:00',
        fin: '21:00',
      });
      expect(crear.horario.hasError('longitud')).toBe(true);
    });

    it('acepta solo visibilidad PUBLICO o PROTEGIDO', () => {
      const { crear } = abrir();
      const visibilidad = crear.acceso.controls['visibilidad'];

      expect(visibilidad.value).toBe('PUBLICO');
      visibilidad.setValue('ARCHIVADO');
      expect(visibilidad.hasError('opcion')).toBe(true);
      visibilidad.setValue('PROTEGIDO');
      expect(visibilidad.valid).toBe(true);
    });
  });

  describe('mensajes en pantalla', () => {
    it('muestra bajo el nombre un mat-error específico después de tocarlo', async () => {
      const { fixture, root } = abrir();
      await settle(fixture);
      expect(root.querySelector('mat-error')).toBeNull();

      const nombre = root.querySelector('#grupo-nombre') as HTMLInputElement;
      nombre.dispatchEvent(new Event('blur'));
      await settle(fixture);
      expect(root.querySelector('mat-error')?.textContent).toContain(
        'Ingresa el nombre del grupo.',
      );

      nombre.value = 'a'.repeat(121);
      nombre.dispatchEvent(new Event('input'));
      await settle(fixture);
      expect(root.querySelector('mat-error')?.textContent).toContain(
        'no debe superar 120 caracteres',
      );
      expect(root.textContent).toContain('121/120');
    });

    it('cuenta los caracteres de la descripción', async () => {
      const { crear, fixture, root } = abrir();
      crear.general.controls['descripcion'].setValue('hola');
      await settle(fixture);

      expect(root.textContent).toContain('4/500');
    });
  });

  describe('asistente por pasos', () => {
    it('no deja avanzar con un paso inválido y deshabilita el botón principal', async () => {
      const { crear, fixture, root } = abrir();
      await settle(fixture);

      expect((boton(root, 'Continuar') as HTMLButtonElement).disabled).toBe(true);
      crear.continuar();
      expect(crear.paso()).toBe(1);
      expect(crear.general.controls['nombre'].touched).toBe(true);
      expect(root.textContent).toContain('Completa los campos obligatorios');
    });

    it('avanza paso a paso cuando cada paso es válido', async () => {
      const { crear, fixture, root } = abrir();
      llenar(crear);
      await settle(fixture);

      expect((boton(root, 'Continuar') as HTMLButtonElement).disabled).toBe(false);
      await irAlResumen(fixture, crear);

      expect(root.textContent).toContain('Entrenamiento de Grafos');
      expect(root.textContent).toContain('Mar, Jue de 19:00 a 21:00');
      expect(root.textContent).toContain('Protegido');
      expect(boton(root, 'Crear grupo')).toBeTruthy();
    });

    it('marca con error un paso que quedó inválido y bloquea el avance', async () => {
      const { crear, fixture, root } = abrir();
      llenar(crear);
      await irAlResumen(fixture, crear);

      crear.irAtras();
      crear.irAtras();
      crear.irAtras();
      crear.general.controls['nombre'].setValue('');
      await settle(fixture);

      expect(crear.paso()).toBe(1);
      expect(crear.pasoConError(1)).toBe(true);
      expect(crear.pasoConError(2)).toBe(false);
      expect(root.textContent).toContain('Corrige este paso');
      crear.continuar();
      expect(crear.paso()).toBe(1);
    });
  });

  describe('envío', () => {
    it('crea el grupo con los datos del contrato y navega a la confirmación', async () => {
      const { stub, crear, fixture, root, navegar } = abrir();
      llenar(crear);
      await irAlResumen(fixture, crear);

      boton(root, 'Crear grupo')!.click();
      await settle(fixture);

      expect(stub.calls.create).toEqual([
        {
          name: 'Entrenamiento de Grafos',
          description: 'Preparación ICPC',
          expectedLevel: 'INTERMEDIO',
          maxCapacity: 15,
          sessionSchedule: 'Mar, Jue de 19:00 a 21:00',
          visibility: 'PROTEGIDO',
        },
      ]);
      expect(navegar).toHaveBeenCalledWith(['/coach/grupos/creado']);
    });

    it('evita el doble envío mientras la petición está en curso', async () => {
      const { stub, crear, fixture, root } = abrir();
      const respuesta = new Subject<CreateGroupResponse>();
      stub.createResult = () => respuesta;
      llenar(crear);
      await irAlResumen(fixture, crear);

      const crearBoton = boton(root, 'Crear grupo') as HTMLButtonElement;
      crearBoton.click();
      crearBoton.click();
      crear.continuar();
      await settle(fixture);

      expect(stub.calls.create.length).toBe(1);
      expect(crear.guardando()).toBe(true);
      expect((boton(root, 'Creando grupo') as HTMLButtonElement).disabled).toBe(true);

      respuesta.next(CREADO);
      respuesta.complete();
      expect(crear.guardando()).toBe(false);
    });

    it('muestra los errores por campo del 400 bajo cada control y conserva lo escrito', async () => {
      const { stub, crear, fixture, root } = abrir();
      stub.createResult = () =>
        throwError(() =>
          httpError(400, {
            message: 'Datos inválidos',
            errors: {
              name: 'Ya existe un grupo con ese nombre',
              sessionSchedule: 'El horario es inválido',
              visibility: 'Visibilidad no permitida',
              otroCampo: 'Mensaje suelto',
            },
          }),
        );
      llenar(crear);
      await irAlResumen(fixture, crear);

      boton(root, 'Crear grupo')!.click();
      await settle(fixture);

      expect(crear.general.controls['nombre'].getError('server')).toBe(
        'Ya existe un grupo con ese nombre',
      );
      expect(crear.horario.getError('server')).toBe('El horario es inválido');
      expect(crear.acceso.controls['visibilidad'].getError('server')).toBe(
        'Visibilidad no permitida',
      );
      expect(crear.general.controls['descripcion'].value).toBe(' Preparación ICPC ');
      expect(crear.general.controls['cupo'].value).toBe(15);
      expect(crear.paso()).toBe(1);
      expect(crear.pasoConError(1)).toBe(true);
      expect(crear.error()).toContain('Mensaje suelto');
      expect(root.querySelector('mat-error')?.textContent).toContain(
        'Ya existe un grupo con ese nombre',
      );
      expect((boton(root, 'Continuar') as HTMLButtonElement).disabled).toBe(true);

      crear.general.controls['nombre'].setValue('Otro nombre');
      expect(crear.general.controls['nombre'].hasError('server')).toBe(false);
      expect(crear.pasoValido(1)).toBe(true);
    });

    it('en un 403 explica que falta el perfil de coach y enlaza a completarlo', async () => {
      const { stub, crear, fixture, root } = abrir();
      stub.createResult = () => throwError(() => httpError(403, { message: 'Prohibido' }));
      llenar(crear);
      await irAlResumen(fixture, crear);

      boton(root, 'Crear grupo')!.click();
      await settle(fixture);

      expect(crear.sinPermiso()).toBe(true);
      const enlace = root.querySelector('a[href="/onboarding/coach/experiencia"]');
      expect(enlace?.textContent).toContain('Completar perfil de coach');
      expect(crear.general.controls['nombre'].value).toBe('  Entrenamiento de Grafos  ');
    });

    it('ante un error del servidor conserva los datos, informa y permite reintentar', async () => {
      const { stub, crear, fixture, root, navegar } = abrir();
      stub.createResult = () => throwError(() => httpError(500));
      llenar(crear);
      await irAlResumen(fixture, crear);

      boton(root, 'Crear grupo')!.click();
      await settle(fixture);
      expect(crear.error()).toContain('No pudimos conectar con el servidor');
      expect(crear.guardando()).toBe(false);
      expect(crear.paso()).toBe(4);

      stub.createResult = () => of(CREADO);
      boton(root, 'Crear grupo')!.click();
      await settle(fixture);
      expect(stub.calls.create.length).toBe(2);
      expect(navegar).toHaveBeenCalledWith(['/coach/grupos/creado']);
    });

    it('no menciona borradores ni ofrece guardar uno', async () => {
      const { fixture, root } = abrir();
      await settle(fixture);

      expect(root.textContent?.toLowerCase()).not.toContain('borrador');
    });
  });
});

describe('Grupo creado (US04)', () => {
  function abrir(creado: CreateGroupResponse | null, copiar = true) {
    const copy = vi.fn(() => copiar);
    const { stub, fixture } = configure(GrupoCreado, [{ provide: Clipboard, useValue: { copy } }]);
    stub.lastCreated.set(creado);
    return { copy, fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('muestra el código de invitación y lo copia con el botón', async () => {
    const { copy, fixture, root } = abrir(CREADO);
    await settle(fixture);

    expect(root.textContent).toContain('CODIGO1234AB');
    boton(root, 'Copiar código')!.click();
    await settle(fixture);

    expect(copy).toHaveBeenCalledWith('CODIGO1234AB');
    expect(root.textContent).toContain('Código copiado');
  });

  it('avisa cuando el navegador no permite copiar', async () => {
    const { fixture, root } = abrir(CREADO, false);
    await settle(fixture);

    boton(root, 'Copiar código')!.click();
    await settle(fixture);

    expect(root.textContent).toContain('No pudimos copiarlo');
  });

  it('sin un grupo recién creado muestra un estado claro con enlaces a los grupos del coach', async () => {
    const { fixture, root } = abrir(null);
    await settle(fixture);

    expect(root.textContent).toContain('No hay un grupo recién creado');
    expect(root.textContent).not.toContain('Copiar código');
    expect(root.querySelector('a[href="/coach/grupos/solicitudes"]')).toBeTruthy();
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).toBeTruthy();
  });
});

interface ExplorarInternals {
  filtros: FormGroup;
  codigo: FormGroup;
  vista(): string;
  fallo(): string | null;
  enviando(): boolean;
  limpiarFiltros(): void;
}

function grupoApi(
  groupId: number,
  name: string,
  extra: Partial<{
    description: string;
    expectedLevel: string;
    visibility: 'PUBLICO' | 'PROTEGIDO';
  }> = {},
) {
  return {
    groupId,
    name,
    description: extra.description ?? 'Sin más detalles',
    expectedLevel: extra.expectedLevel ?? 'INTERMEDIO',
    maxCapacity: 15,
    sessionSchedule: 'Mar, Jue de 19:00 a 21:00',
    status: 'ACTIVO' as const,
    visibility: extra.visibility ?? ('PUBLICO' as const),
  };
}

function membresia(groupId: number, status: string) {
  return {
    groupId,
    membership: { membershipId: groupId * 10, status, teamRole: 'MIEMBRO', joinedAt: null, leftAt: null },
  };
}

describe('Explorar grupos (US05)', () => {
  const CATALOGO = [
    grupoApi(1, 'Entrenamiento de Grafos', { description: 'Grafos y DP', expectedLevel: 'INTERMEDIO' }),
    grupoApi(2, 'Introducción a Algoritmos', {
      description: 'Búsqueda binaria y ordenamiento',
      expectedLevel: 'PRINCIPIANTE',
      visibility: 'PROTEGIDO',
    }),
    grupoApi(3, 'Maratón Avanzada', {
      description: 'Problemas de ICPC regional',
      expectedLevel: 'AVANZADO',
    }),
  ];

  function abrir(
    preparar: (stub: TeamsStub) => void = (stub) => {
      stub.groups.set(CATALOGO as never);
      stub.mine.set([membresia(2, 'PENDIENTE'), membresia(3, 'ACTIVO')]);
    },
  ) {
    const { stub, fixture } = configure(ExplorarGrupos, [], preparar);
    const explorar = fixture.componentInstance as unknown as ExplorarInternals;
    return { stub, fixture, explorar, root: fixture.nativeElement as HTMLElement };
  }

  /** Nombres de los grupos que muestra el listado, en orden. */
  function nombres(root: HTMLElement) {
    return [...root.querySelectorAll('[data-grupo] h2')].map((h) =>
      h.textContent?.trim(),
    );
  }

  async function filtrar(
    fixture: { detectChanges(): void; whenStable(): Promise<unknown> },
    explorar: ExplorarInternals,
    valores: Record<string, unknown>,
  ) {
    explorar.filtros.patchValue(valores);
    await settle(fixture);
  }

  describe('listado, búsqueda y filtros', () => {
    it('muestra los grupos publicados con un contador real', async () => {
      const { fixture, root } = abrir();
      await settle(fixture);

      expect(nombres(root)).toEqual([
        'Entrenamiento de Grafos',
        'Introducción a Algoritmos',
        'Maratón Avanzada',
      ]);
      expect(root.textContent).toContain('Mostrando 3 de 3 grupos');
    });

    it('busca por texto en nombre y descripción sin distinguir acentos ni mayúsculas', async () => {
      const { fixture, explorar, root } = abrir();
      await settle(fixture);

      await filtrar(fixture, explorar, { buscar: 'BUSQUEDA' });
      expect(nombres(root)).toEqual(['Introducción a Algoritmos']);
      expect(root.textContent).toContain('Mostrando 1 de 3 grupos');

      await filtrar(fixture, explorar, { buscar: '  maraton ' });
      expect(nombres(root)).toEqual(['Maratón Avanzada']);

      await filtrar(fixture, explorar, { buscar: 'dp' });
      expect(nombres(root)).toEqual(['Entrenamiento de Grafos']);
    });

    it('filtra por nivel y combina varios niveles', async () => {
      const { fixture, explorar, root } = abrir();
      await settle(fixture);

      await filtrar(fixture, explorar, { intermedio: true });
      expect(nombres(root)).toEqual(['Entrenamiento de Grafos']);

      await filtrar(fixture, explorar, { avanzado: true });
      expect(nombres(root)).toEqual(['Entrenamiento de Grafos', 'Maratón Avanzada']);
    });

    it('filtra por visibilidad', async () => {
      const { fixture, explorar, root } = abrir();
      await settle(fixture);

      await filtrar(fixture, explorar, { protegido: true });
      expect(nombres(root)).toEqual(['Introducción a Algoritmos']);

      await filtrar(fixture, explorar, { protegido: false, publico: true });
      expect(nombres(root)).toEqual(['Entrenamiento de Grafos', 'Maratón Avanzada']);

      await filtrar(fixture, explorar, { protegido: true });
      expect(nombres(root).length).toBe(3);
    });

    it('filtra por mi participación: miembro, pendiente o ambos', async () => {
      const { fixture, explorar, root } = abrir();
      await settle(fixture);

      await filtrar(fixture, explorar, { miembro: true });
      expect(nombres(root)).toEqual(['Maratón Avanzada']);

      await filtrar(fixture, explorar, { miembro: false, pendiente: true });
      expect(nombres(root)).toEqual(['Introducción a Algoritmos']);

      await filtrar(fixture, explorar, { miembro: true });
      expect(nombres(root)).toEqual(['Introducción a Algoritmos', 'Maratón Avanzada']);
    });

    it('combina filtros, avisa cuando nada coincide y permite limpiarlos', async () => {
      const { fixture, explorar, root } = abrir();
      await settle(fixture);

      await filtrar(fixture, explorar, { buscar: 'grafos', avanzado: true });
      expect(nombres(root)).toEqual([]);
      expect(root.textContent).toContain('Ningún grupo coincide con tu búsqueda');
      expect(root.textContent).toContain('Mostrando 0 de 3 grupos');

      boton(root, 'Limpiar filtros')!.click();
      await settle(fixture);
      expect(nombres(root).length).toBe(3);
      expect(explorar.filtros.getRawValue()['buscar']).toBe('');
    });

    it('filtra al escribir en el buscador', async () => {
      const { fixture, root } = abrir();
      await settle(fixture);

      const buscador = root.querySelector('#buscar-grupos') as HTMLInputElement;
      buscador.value = 'icpc';
      buscador.dispatchEvent(new Event('input'));
      await settle(fixture);

      expect(nombres(root)).toEqual(['Maratón Avanzada']);
      expect((boton(root, 'Limpiar') as HTMLButtonElement).disabled).toBe(false);
    });

    it('deshabilita Limpiar mientras no hay filtros activos', async () => {
      const { fixture, root } = abrir();
      await settle(fixture);

      expect((boton(root, 'Limpiar') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('estados de carga', () => {
    it('muestra un estado vacío cuando no hay grupos', async () => {
      const { fixture, root } = abrir((stub) => stub.groups.set([]));
      await settle(fixture);

      expect(root.textContent).toContain('Todavía no hay grupos disponibles');
      expect(root.textContent).toContain('Mostrando 0 de 0 grupos');
    });

    it('ante un error de carga muestra el motivo y reintenta con el botón', async () => {
      const { stub, fixture, root } = abrir((stub) => {
        stub.groups.set(CATALOGO as never);
        stub.groupsResult = () => throwError(() => httpError(500));
      });
      await settle(fixture);

      expect(root.textContent).toContain('No pudimos cargar los grupos');
      expect(root.textContent).not.toContain('Todavía no hay grupos disponibles');

      stub.groupsResult = () => of(CATALOGO);
      boton(root, 'Reintentar')!.click();
      await settle(fixture);

      expect(root.textContent).not.toContain('No pudimos cargar los grupos');
      expect(nombres(root).length).toBe(3);
    });

    it('si falla la consulta de membresías avisa y sigue mostrando los grupos', async () => {
      const { fixture, root } = abrir((stub) => {
        stub.groups.set(CATALOGO as never);
        stub.mineResult = () => throwError(() => httpError(500));
      });
      await settle(fixture);

      expect(root.textContent).toContain('No pudimos consultar tus membresías');
      expect(nombres(root).length).toBe(3);
    });
  });

  describe('acción según el estado de la membresía', () => {
    async function tarjeta(visibility: 'PUBLICO' | 'PROTEGIDO', estado: string | null) {
      const { fixture, root } = abrir((stub) => {
        stub.groups.set([grupoApi(1, 'Grupo de prueba', { visibility })] as never);
        stub.mine.set(estado ? [membresia(1, estado)] : []);
      });
      await settle(fixture);
      return root;
    }

    it('sin membresía ofrece Unirme en un grupo público y Solicitar ingreso en uno protegido', async () => {
      const publico = await tarjeta('PUBLICO', null);
      expect(boton(publico, 'Unirme')).toBeTruthy();
      expect(publico.textContent).toContain('Abierto');
      TestBed.resetTestingModule();

      const protegido = await tarjeta('PROTEGIDO', null);
      expect(boton(protegido, 'Solicitar ingreso')).toBeTruthy();
      expect(boton(protegido, 'Unirme')).toBeUndefined();
    });

    it('con solicitud PENDIENTE muestra Solicitud pendiente y no permite volver a solicitar', async () => {
      const root = await tarjeta('PROTEGIDO', 'PENDIENTE');

      expect(root.textContent).toContain('Solicitud pendiente');
      expect(boton(root, 'Solicitar ingreso')).toBeUndefined();
      expect(boton(root, 'Unirme')).toBeUndefined();
    });

    it('con membresía ACTIVO muestra Eres miembro y un enlace al grupo', async () => {
      const root = await tarjeta('PUBLICO', 'ACTIVO');

      expect(root.textContent).toContain('Eres miembro');
      expect(root.querySelector('a[href^="/inicio"]')?.textContent).toContain('Ver grupo');
      expect(boton(root, 'Unirme')).toBeUndefined();
    });

    it('con solicitud RECHAZADA o tras RETIRARSE permite volver a solicitar', async () => {
      for (const estado of ['RECHAZADO', 'RETIRADO']) {
        const protegido = await tarjeta('PROTEGIDO', estado);
        expect(boton(protegido, 'Volver a solicitar'), estado).toBeTruthy();
        TestBed.resetTestingModule();

        const publico = await tarjeta('PUBLICO', estado);
        expect(boton(publico, 'Volver a unirme'), estado).toBeTruthy();
        TestBed.resetTestingModule();
      }
    });

    it('con membresía EXPULSADO deshabilita la acción y explica el motivo', async () => {
      const root = await tarjeta('PUBLICO', 'EXPULSADO');

      const accion = boton(root, 'No disponible') as HTMLButtonElement;
      expect(accion.disabled).toBe(true);
      expect(root.textContent).toContain('no puedes volver a solicitar ingreso');
      expect(boton(root, 'Unirme')).toBeUndefined();
    });
  });

  /** Catálogo sin membresías: todos los grupos admiten la acción de ingresar. */
  const sinMembresias = (stub: TeamsStub) => {
    stub.groups.set(CATALOGO as never);
    stub.mine.set([]);
  };

  describe('ingreso a un grupo', () => {
    it('un grupo público registra el ingreso al instante y confirma la membresía', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      stub.joinResult = (groupId) =>
        of({ message: 'ok', membershipId: 1, groupId, status: 'ACTIVO' });
      await settle(fixture);

      boton(root, 'Unirme')!.click();
      await settle(fixture);

      expect(stub.calls.join).toEqual([{ groupId: 1, code: '' }]);
      expect(root.textContent).toContain('Ya eres parte del grupo');
    });

    it('un grupo protegido sin código deja la solicitud pendiente', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      await settle(fixture);

      boton(root, 'Solicitar ingreso')!.click();
      await settle(fixture);
      expect(root.querySelector('[role="dialog"]')).toBeTruthy();
      expect(root.textContent).toContain('Código de invitación (opcional)');

      (root.querySelector('button[type="submit"]') as HTMLButtonElement).click();
      await settle(fixture);

      expect(stub.calls.join).toEqual([{ groupId: 2, code: '' }]);
      expect(root.textContent).toContain('Solicitud enviada');
    });

    it('recorta los espacios del código y lo envía', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      stub.joinResult = (groupId) =>
        of({ message: 'ok', membershipId: 1, groupId, status: 'ACTIVO' });
      await settle(fixture);

      boton(root, 'Solicitar ingreso')!.click();
      await settle(fixture);
      const codigo = root.querySelector('#invitacion') as HTMLInputElement;
      codigo.value = '  A1B2C3  ';
      codigo.dispatchEvent(new Event('input'));
      await settle(fixture);
      (root.querySelector('button[type="submit"]') as HTMLButtonElement).click();
      await settle(fixture);

      expect(stub.calls.join).toEqual([{ groupId: 2, code: 'A1B2C3' }]);
      expect(root.textContent).toContain('Ya eres parte del grupo');
    });

    it('rechaza códigos con símbolos o espacios internos con un mensaje claro', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      await settle(fixture);

      boton(root, 'Solicitar ingreso')!.click();
      await settle(fixture);
      const codigo = root.querySelector('#invitacion') as HTMLInputElement;
      for (const invalido of ['AB-12', 'AB 12', 'ñandú']) {
        codigo.value = invalido;
        codigo.dispatchEvent(new Event('input'));
        codigo.dispatchEvent(new Event('blur'));
        await settle(fixture);

        expect(root.querySelector('mat-error')?.textContent, invalido).toContain(
          'solo puede tener letras y números',
        );
        expect((root.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
      }
      expect(stub.calls.join).toEqual([]);
    });

    it('ingresar con código exige elegir el grupo y escribir el código', async () => {
      const { stub, fixture, explorar, root } = abrir(sinMembresias);
      stub.joinResult = (groupId) =>
        of({ message: 'ok', membershipId: 1, groupId, status: 'ACTIVO' });
      await settle(fixture);

      boton(root, 'Ingresar con código')!.click();
      await settle(fixture);
      const enviar = root.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(enviar.disabled).toBe(true);

      explorar.codigo.patchValue({ grupo: 2 });
      await settle(fixture);
      expect(enviar.disabled).toBe(true);
      explorar.codigo.patchValue({ invitacion: ' Z9Y8X7 ' });
      await settle(fixture);
      expect(enviar.disabled).toBe(false);

      enviar.click();
      await settle(fixture);
      expect(stub.calls.join).toEqual([{ groupId: 2, code: 'Z9Y8X7' }]);
      expect(root.textContent).toContain('Ya eres parte del grupo');
    });

    it('evita el doble envío mientras se registra el ingreso', async () => {
      const { stub, fixture, explorar, root } = abrir(sinMembresias);
      const respuesta = new Subject<JoinGroupResponse>();
      stub.joinResult = () => respuesta;
      await settle(fixture);

      boton(root, 'Unirme')!.click();
      await settle(fixture);
      expect(explorar.enviando()).toBe(true);
      expect((boton(root, 'Unirme') as HTMLButtonElement).disabled).toBe(true);
      boton(root, 'Unirme')!.click();

      expect(stub.calls.join.length).toBe(1);
    });
  });

  describe('errores al ingresar', () => {
    const conflictos: [string, string, string][] = [
      ['Ya tienes una solicitud pendiente para este grupo', 'duplicada', 'Ya tienes una solicitud pendiente'],
      ['YA TIENES UNA SOLICITUD PENDIENTE PARA ESTE GRUPO', 'duplicada', 'Ya tienes una solicitud pendiente'],
      ['Ya eres miembro ACTIVO de este grupo', 'duplicada', 'Ya eres miembro de este grupo'],
      ['El grupo alcanzó su cupo máximo', 'sin-cupos', 'El grupo no tiene cupo'],
      ['No hay vacantes: el grupo está LLENO', 'sin-cupos', 'El grupo no tiene cupo'],
      ['Un integrante EXPULSADO no puede volver a solicitar ingreso', 'no-admite', 'No puedes volver a este grupo'],
      ['El grupo archivado no admite postulaciones', 'no-admite', 'Este grupo no admite postulaciones'],
    ];

    for (const [mensaje, vista, titulo] of conflictos) {
      it(`409 «${mensaje}» muestra «${titulo}»`, async () => {
        const { stub, fixture, explorar, root } = abrir(sinMembresias);
        stub.joinResult = () => throwError(() => httpError(409, { message: mensaje }));
        await settle(fixture);
        const cargasPrevias = stub.calls.loadGroups;

        boton(root, 'Unirme')!.click();
        await settle(fixture);

        expect(explorar.vista()).toBe(vista);
        expect(root.querySelector('[role="dialog"] h2')?.textContent).toContain(titulo);
        expect(root.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain(mensaje);
        // El estado real pudo cambiar: se vuelve a consultar el listado.
        expect(stub.calls.loadGroups).toBe(cargasPrevias + 1);
      });
    }

    it('403 explica que solo los practicantes con perfil pueden unirse', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      stub.joinResult = () => throwError(() => httpError(403));
      await settle(fixture);

      boton(root, 'Unirme')!.click();
      await settle(fixture);

      expect(root.querySelector('[role="dialog"]')?.textContent).toContain(
        'solo los practicantes con el perfil completo',
      );
    });

    it('404 informa que el grupo ya no está disponible', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      stub.joinResult = () => throwError(() => httpError(404));
      await settle(fixture);

      boton(root, 'Unirme')!.click();
      await settle(fixture);

      expect(root.querySelector('[role="dialog"] h2')?.textContent).toContain(
        'El grupo ya no está disponible',
      );
    });

    it('un error de red permite reintentar el mismo ingreso', async () => {
      const { stub, fixture, root } = abrir(sinMembresias);
      stub.joinResult = () => throwError(() => httpError(0));
      await settle(fixture);

      boton(root, 'Unirme')!.click();
      await settle(fixture);
      expect(root.querySelector('[role="dialog"]')?.textContent).toContain(
        'No pudimos conectar con el servidor',
      );

      stub.joinResult = (groupId) =>
        of({ message: 'ok', membershipId: 1, groupId, status: 'ACTIVO' });
      boton(root, 'Reintentar')!.click();
      await settle(fixture);

      expect(stub.calls.join).toEqual([
        { groupId: 1, code: '' },
        { groupId: 1, code: '' },
      ]);
      expect(root.textContent).toContain('Ya eres parte del grupo');
    });
  });
});

interface SolicitudesInternals {
  selector: FormGroup;
  selectedGroupId(): number | null;
  guardando(): boolean;
}

function postulacion(membershipId: number, fullName: string, extra: Partial<Membership> = {}): Membership {
  return {
    membershipId,
    groupId: 1,
    practitionerId: membershipId + 100,
    status: 'PENDIENTE',
    requestedAt: '2026-11-02T18:20:00-05:00',
    practitioner: {
      fullName,
      studentCode: `U20200${membershipId}`,
      career: 'Ingeniería de Software',
      academicCycle: 5,
      competitiveLevel: 'INTERMEDIO',
      codeforcesHandle: 'ana_cf',
      codeforcesRating: 1520,
      atcoderHandle: 'ana_ac',
      vjudgeHandle: null,
    },
    ...extra,
  };
}

function grupoCoach(groupId: number, name: string, extra: Partial<CoachGroup> = {}): CoachGroup {
  return {
    groupId,
    name,
    description: null,
    expectedLevel: 'INTERMEDIO',
    maxCapacity: 15,
    sessionSchedule: null,
    status: 'ACTIVO',
    visibility: 'PROTEGIDO',
    invitationCode: 'A1B2C3D4E5F6',
    activeMembers: 3,
    pendingRequests: 2,
    ...extra,
  };
}

describe('Solicitudes de ingreso (US06)', () => {
  const ANA = postulacion(101, 'Ana Prueba');
  const LUIS = postulacion(102, 'Luis Prueba');

  function abrir(preparar: (stub: TeamsStub) => void = () => undefined) {
    const { stub, fixture } = configure(SolicitudesGrupo, [], (stub) => {
      stub.requests.set([ANA, LUIS]);
      stub.mine.set([grupoCoach(1, 'Grafos'), grupoCoach(2, 'Algoritmos')]);
      preparar(stub);
    });
    const solicitudes = fixture.componentInstance as unknown as SolicitudesInternals;
    return { stub, fixture, solicitudes, root: fixture.nativeElement as HTMLElement };
  }

  async function revisar(
    fixture: { detectChanges(): void; whenStable(): Promise<unknown> },
    root: HTMLElement,
    indice = 0,
  ) {
    botones(root).filter((b) => b.textContent?.trim() === 'Revisar')[indice].click();
    await settle(fixture);
  }

  it('pide solo las postulaciones pendientes del primer grupo y muestra su perfil', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);

    expect(stub.calls.loadRequests).toEqual([1]);
    expect(root.textContent).toContain('Ana Prueba');
    expect(root.textContent).toContain('U20200101');
    expect(root.textContent).toContain('Ingeniería de Software');
    expect(root.textContent).toContain('Nivel Intermedio');
    expect(root.textContent).toContain('ana_cf');
    expect(root.textContent).toContain('(1520)');
    expect(root.textContent).toContain('Pendientes (2)');
    expect(root.textContent).toContain('3 / 15 integrantes');
  });

  it('el diálogo de revisión muestra el perfil académico y competitivo completo', async () => {
    const { fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);

    const dialogo = root.querySelector('[role="dialog"]') as HTMLElement;
    for (const texto of ['Ingeniería de Software', 'ciclo 5', 'ana_cf · rating 1520', 'ana_ac', 'U20200101']) {
      expect(dialogo.textContent, texto).toContain(texto);
    }
    expect(dialogo.textContent).not.toContain('Aclaración');
  });

  it('abre el grupo indicado en el parámetro grupo de la URL', async () => {
    const { stub, fixture } = configure(SolicitudesGrupo, [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({ grupo: '2' }) } },
      },
    ], (stub) => stub.mine.set([grupoCoach(1, 'Grafos'), grupoCoach(2, 'Algoritmos')]));
    await settle(fixture);

    expect(stub.calls.loadRequests).toEqual([2]);
  });

  it('cambiar de grupo carga las solicitudes del nuevo grupo', async () => {
    const { stub, fixture, solicitudes } = abrir();
    await settle(fixture);

    solicitudes.selector.controls['grupo'].setValue(2);
    await settle(fixture);

    expect(solicitudes.selectedGroupId()).toBe(2);
    expect(stub.calls.loadRequests).toEqual([1, 2]);
  });

  it('acepta una solicitud con la decisión ACEPTAR y refresca los contadores', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    const cargasPrevias = stub.calls.loadMine;
    await revisar(fixture, root);

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);

    expect(stub.calls.decide).toEqual([{ id: 101, decision: 'ACEPTAR' }]);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).not.toContain('Ana Prueba');
    expect(root.textContent).toContain('Luis Prueba');
    expect(stub.calls.loadMine).toBe(cargasPrevias + 1);
  });

  it('pide confirmación explícita antes de rechazar', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);

    boton(root, 'Rechazar')!.click();
    await settle(fixture);
    expect(stub.calls.decide).toEqual([]);
    expect(root.textContent).toContain('¿Rechazar la solicitud de Ana Prueba?');

    boton(root, 'Volver')!.click();
    await settle(fixture);
    expect(stub.calls.decide).toEqual([]);
    expect(boton(root, 'Aceptar solicitud')).toBeTruthy();

    boton(root, 'Rechazar')!.click();
    await settle(fixture);
    boton(root, 'Sí, rechazar')!.click();
    await settle(fixture);

    expect(stub.calls.decide).toEqual([{ id: 101, decision: 'RECHAZAR' }]);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('deshabilita las acciones mientras se guarda y no envía dos veces', async () => {
    const { stub, fixture, solicitudes, root } = abrir();
    const respuesta = new Subject<ReviewMembershipResponse>();
    stub.decideResult = () => respuesta;
    await settle(fixture);
    await revisar(fixture, root);

    const aceptar = boton(root, 'Aceptar solicitud') as HTMLButtonElement;
    aceptar.click();
    await settle(fixture);

    expect(solicitudes.guardando()).toBe(true);
    expect((boton(root, 'Guardando') as HTMLButtonElement).disabled).toBe(true);
    expect((boton(root, 'Rechazar') as HTMLButtonElement).disabled).toBe(true);
    (boton(root, 'Guardando') as HTMLButtonElement).click();
    expect(stub.calls.decide.length).toBe(1);

    respuesta.next({ message: 'ok', membershipId: 101, groupId: 1, status: 'ACTIVO' });
    respuesta.complete();
    await settle(fixture);
    expect(solicitudes.guardando()).toBe(false);
  });

  it('ante un 409 de postulación ya atendida refresca la lista y muestra su estado actual', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);
    const cargasPrevias = stub.calls.loadRequests.length;
    stub.decideResult = () =>
      throwError(() => httpError(409, { message: 'La solicitud ya fue respondida' }));
    // Otro coach la atendió: ya no figura entre las pendientes.
    stub.requestsResult = () => of([LUIS]);

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);

    const dialogo = root.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialogo.textContent).toContain('La solicitud ya fue atendida');
    expect(dialogo.textContent).toContain('Postulación: atendida, ya no está pendiente');
    expect(dialogo.textContent).toContain('No se modificó la membresía');
    expect(stub.calls.loadRequests.length).toBe(cargasPrevias + 1);
    expect(boton(root, 'Aceptar solicitud')).toBeUndefined();

    boton(root, 'Cerrar')!.click();
    await settle(fixture);
    expect(root.textContent).not.toContain('Ana Prueba');
    expect(root.textContent).toContain('Luis Prueba');
  });

  it('ante un 409 por falta de cupo la postulación sigue pendiente y se actualizan los contadores', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);
    const cargasPrevias = stub.calls.loadMine;
    stub.decideResult = () =>
      throwError(() => httpError(409, { message: 'El grupo no tiene cupo disponible' }));

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);

    const dialogo = root.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialogo.textContent).toContain('El grupo no tiene cupo');
    expect(dialogo.textContent).toContain('Postulación: pendiente, sin cambios');
    expect(stub.calls.loadMine).toBe(cargasPrevias + 1);
    expect(root.textContent).toContain('Ana Prueba');
  });

  it('ante un 403 explica que solo el coach responsable puede decidir', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);
    stub.decideResult = () => throwError(() => httpError(403));

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);

    expect(root.querySelector('[role="dialog"]')?.textContent).toContain(
      'No eres el coach responsable de este grupo',
    );
  });

  it('ante un 404 informa que la solicitud ya no existe y refresca la lista', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);
    stub.decideResult = () => throwError(() => httpError(404));
    stub.requestsResult = () => of([LUIS]);

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);

    expect(root.querySelector('[role="dialog"]')?.textContent).toContain(
      'La solicitud ya no existe',
    );
  });

  it('ante un error de red conserva la revisión y permite reintentar', async () => {
    const { stub, fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);
    stub.decideResult = () => throwError(() => httpError(500));

    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos conectar con el servidor',
    );

    stub.decideResult = (id) => of({ message: 'ok', membershipId: id, groupId: 1, status: 'ACTIVO' });
    boton(root, 'Aceptar solicitud')!.click();
    await settle(fixture);
    expect(stub.calls.decide.length).toBe(2);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay solicitudes pendientes', async () => {
    const { fixture, root } = abrir((stub) => stub.requests.set([]));
    await settle(fixture);

    expect(root.textContent).toContain('No hay solicitudes pendientes');
  });

  it('avisa cuando el grupo está completo', async () => {
    const { fixture, root } = abrir((stub) =>
      stub.mine.set([grupoCoach(1, 'Grafos', { activeMembers: 15 })]),
    );
    await settle(fixture);

    expect(root.textContent).toContain('El grupo está completo');
  });

  it('un coach sin grupos ve una llamada a crear su primer grupo', async () => {
    const { stub, fixture, root } = abrir((stub) => stub.mine.set([]));
    await settle(fixture);

    expect(root.textContent).toContain('Todavía no tienes grupos');
    expect(root.querySelector('a[href="/coach/grupos/crear"]')).toBeTruthy();
    expect(stub.calls.loadRequests).toEqual([]);
  });

  it('si falla la carga de grupos permite reintentar', async () => {
    const { stub, fixture, root } = abrir((stub) => {
      stub.mineResult = () => throwError(() => httpError(500));
    });
    await settle(fixture);
    expect(root.textContent).toContain('No pudimos cargar tus grupos');

    stub.mineResult = () => of(stub.mine());
    boton(root, 'Reintentar')!.click();
    await settle(fixture);

    expect(root.textContent).not.toContain('No pudimos cargar tus grupos');
    expect(root.textContent).toContain('Ana Prueba');
  });

  it('si falla la carga de solicitudes permite reintentar', async () => {
    const { stub, fixture, root } = abrir((stub) => {
      stub.requestsResult = () => throwError(() => httpError(500));
    });
    await settle(fixture);
    expect(root.textContent).toContain('No pudimos cargar las solicitudes');

    stub.requestsResult = () => of([ANA]);
    boton(root, 'Reintentar')!.click();
    await settle(fixture);

    expect(root.textContent).not.toContain('No pudimos cargar las solicitudes');
    expect(root.textContent).toContain('Ana Prueba');
  });

  it('no ofrece aclaraciones', async () => {
    const { fixture, root } = abrir();
    await settle(fixture);
    await revisar(fixture, root);

    expect(root.textContent?.toLowerCase()).not.toContain('aclaraci');
  });
});

describe('Seguimiento de grupo (ruta antigua)', () => {
  it('redirige a las solicitudes reales en lugar de mostrar datos de ejemplo', async () => {
    TestBed.configureTestingModule({ imports: [SeguimientoGrupo], providers: [provideRouter([])] });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SeguimientoGrupo);
    await settle(fixture);

    expect(navegar).toHaveBeenCalledWith('/coach/grupos/solicitudes', { replaceUrl: true });
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Camila');
  });
});
