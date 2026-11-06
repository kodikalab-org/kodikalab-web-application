import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Session } from '../core/session';

describe('Variantes estáticas pendientes', () => {
  async function abrir(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(Session).startDemo(url.startsWith('/coach/') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    return { harness, root: harness.routeNativeElement! };
  }
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    // Las pantallas de grupos ya consultan la API real: se descartan las
    // peticiones pendientes para no arrastrarlas al siguiente caso.
    http.match(() => true).forEach((request) => request.flush([]));
    http.verify();
    TestBed.inject(Session).logout();
  });

  const casos = [
    ['/registro-exitoso?estado=verificacion-pendiente', 'Revisa tu correo institucional'],
    ['/registro-exitoso?estado=cuenta-activada', 'Tu cuenta está activada'],
    ['/login?estado=cuenta-deshabilitada', 'Tu cuenta no está habilitada'],
    ['/progreso?estado=sin-actividad', 'Aún no tienes actividad en ningún tema'],
    ['/progreso?estado=actividad-mixta', 'CON RESULTADOS · 3'],
    ['/progreso?estado=inconsistentes', 'No pudimos calcular tu progreso'],
    ['/progreso?estado=no-disponible', 'No pudimos obtener tus registros'],
    ['/progreso?estado=sin-pertenencia', 'No pudimos mostrar este progreso'],
    ['/ranking?estado=inconsistentes', 'Última clasificación válida'],
    ['/ranking?estado=compartidas', 'Dos integrantes comparten el segundo puesto'],
    ['/coach/rendimiento?estado=insuficiente', 'No hay información suficiente'],
    ['/coach/rendimiento?estado=igual-prioridad', 'Hay dos temas con el mismo nivel de resolución'],
    ['/coach/competencias?estado=registrado', 'Resultado registrado'],
    ['/coach/competencias?estado=duplicado', 'Ya existe una participación equivalente'],
    ['/coach/competencias?estado=validacion-pendiente', 'Participación guardada como pendiente'],
    ['/coach/competencias?estado=incompletos', 'Revisa los datos antes de publicar'],
    ['/progreso/equipos?estado=contexto-invalido', 'Selecciona un equipo al que pertenezcas'],
    ['/progreso/equipos?estado=actividad-registrada', 'Resolución registrada solo en Equipo Alfa'],
  ];
  for (const [url, texto] of casos) {
    it(`representa ${url} sin solicitudes HTTP`, async () => {
      const { root } = await abrir(url);
      expect(root.textContent).toContain(texto);
    });
  }

  it('no muestra indicadores o barras cuando no se puede consultar el progreso', async () => {
    const { root, harness } = await abrir('/progreso?estado=inconsistentes');
    for (const estado of ['inconsistentes', 'no-disponible', 'sin-pertenencia']) {
      await harness.navigateByUrl(`/progreso?estado=${estado}`);
      expect(root.querySelector('[aria-label="Resumen del progreso"]')).toBeNull();
      expect(root.querySelector('[role="progressbar"]')).toBeNull();
    }
  });
  it('no confunde ausencia de actividad con cobertura calculada de un tema', async () => {
    const { root } = await abrir('/progreso?estado=sin-actividad');
    expect(root.querySelectorAll('article')).toHaveLength(6);
    expect(root.querySelectorAll('[role="progressbar"]')).toHaveLength(0);
    expect(root.textContent).not.toContain('Son los temas con menor cobertura');
  });
  it('presenta posiciones compartidas 1, 2, 2, 4, 5 sin recalcularlas', async () => {
    const { root } = await abrir('/ranking?estado=compartidas');
    expect(
      [...root.querySelectorAll('tbody tr')].map((row) =>
        row.querySelector('td')?.textContent?.trim(),
      ),
    ).toEqual(['1', '2', '2', '4', '5']);
  });
  it('no emite un reporte incompleto ni deja habilitado guardar prioridades', async () => {
    const { root } = await abrir('/coach/rendimiento?estado=insuficiente');
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
  });
  it('no publica una participación pendiente sin puesto', async () => {
    const { root } = await abrir('/coach/competencias?estado=validacion-pendiente');
    expect(root.querySelector<HTMLInputElement>('#puesto')?.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')?.disabled).toBe(true);
    expect(root.textContent).toContain('Pendiente · no publicado');
  });
  it('no muestra actividad ni métricas de un contexto inválido', async () => {
    const { root } = await abrir('/progreso/equipos?estado=contexto-invalido');
    expect(root.querySelector('tbody')).toBeNull();
    expect(root.querySelector('[aria-label="Resumen del equipo seleccionado"]')).toBeNull();
  });
});
