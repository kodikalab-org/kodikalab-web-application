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
import {
  CoachGroup,
  CreateGroupRequest,
  CreateGroupResponse,
  Membership,
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
  };

  /** Respuestas programables: cada prueba reemplaza la que necesita. */
  createResult: () => Observable<CreateGroupResponse> = () => of(CREADO);

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
    return this.createResult().pipe(tap((response) => this.lastCreated.set(response)));
  }
  decide(groupId: number, membershipId: number, decision: string) {
    this.calls.decide.push({ id: membershipId, decision });
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

function configure<T>(component: Type<T>, providers: unknown[] = []) {
  const stub = new TeamsStub();
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

    expect(stub.calls.decide).toEqual([{ id: 101, decision: 'ACEPTAR' }]);
  });
});

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
