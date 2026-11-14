import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Session } from '../core/session';
import { signIn } from '../testing/sign-in';

describe('Variantes estáticas pendientes', () => {
  async function abrir(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    if (!url.startsWith('/login')) signIn(url.startsWith('/coach/') ? 'COACH' : 'PRACTICANTE');
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
    ['/coach/grupos/crear?paso=4&estado=creando', 'Creando grupo…'],
    ['/coach/grupos/crear?paso=4&estado=perfil-incompleto', 'Completa tu perfil de coach'],
    ['/coach/grupos/crear?estado=sin-permisos', 'No tienes permisos para crear grupos'],
    ['/coach/grupos/crear?paso=4&estado=conexion', 'No pudimos crear el grupo'],
    ['/coach/grupos/seguimiento?vista=sin-vigencia', 'La solicitud ya no está vigente'],
    ['/coach/grupos/seguimiento?vista=sin-vacantes', 'El grupo no tiene vacantes'],
    [
      '/coach/grupos/seguimiento?vista=sin-autorizacion',
      'No tienes permiso para procesar esta solicitud',
    ],
  ];
  for (const [url, texto] of casos) {
    it(`representa ${url} sin solicitudes HTTP`, async () => {
      const { root } = await abrir(url);
      expect(root.textContent).toContain(texto);
    });
  }

  it('ignora la variante ?estado= de login y muestra el formulario real', async () => {
    const { root } = await abrir('/login?estado=cuenta-deshabilitada');
    expect(root.querySelector('form')).not.toBeNull();
    expect(root.textContent).not.toContain('Tu cuenta no está habilitada');
    expect(root.textContent).not.toContain('camila.rojas');
    expect(root.querySelector('a[href^="/demo"]')).toBeNull();
  });
});
