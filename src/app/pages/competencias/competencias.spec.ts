import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session';
import { routes } from '../../app.routes';

describe('Registro visual de competencias · US-13', () => {
  async function abrir(url = '/coach/competencias') {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(Session).startDemo('COACH');
    const harness = await RouterTestingHarness.create(url);
    const root = harness.routeNativeElement!;
    const estabilizar = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const escribir = async (id: string, valor: string) => {
      const input = root.querySelector<HTMLInputElement>(id)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await estabilizar();
    };
    await estabilizar();
    return { root, harness, escribir, estabilizar };
  }

  afterEach(() => TestBed.inject(Session).logout());

  it('muestra los datos del Figma y distingue el historial de ejemplo', async () => {
    const { root } = await abrir();
    expect(root.querySelector('h1')?.textContent).toContain('Historial competitivo');
    expect(root.querySelectorAll('article')).toHaveLength(2);
    expect(root.textContent).toContain('Maqueta · Datos de ejemplo');
    expect(root.querySelector<HTMLInputElement>('#fecha')!.value).toContain('31');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(false);
    expect(root.querySelector('mat-error')).toBeNull();
  });

  it('muestra errores después de tocar los campos y bloquea datos incompletos', async () => {
    const { root, escribir } = await abrir();
    await escribir('#competencia', ' ');
    expect(root.textContent).toContain('Ingresa el nombre oficial');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('button[mat-stroked-button]')!.disabled).toBe(true);
    await escribir('#competencia', 'Competencia de prueba');
    await escribir('#fecha', '');
    expect(root.textContent).toContain('Selecciona una fecha válida');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(true);
  });

  it('rechaza puestos inconsistentes, negativos y fraccionarios', async () => {
    const { root, escribir } = await abrir();
    const guardar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    await escribir('#puesto', '85');
    expect(guardar.disabled).toBe(true);
    expect(root.textContent).toContain('El puesto no puede superar');
    await escribir('#total', '100');
    expect(guardar.disabled).toBe(false);
    await escribir('#puesto', '-1');
    expect(guardar.disabled).toBe(true);
    await escribir('#puesto', '1.5');
    expect(guardar.disabled).toBe(true);
    await escribir('#puesto', '1');
    await escribir('#total', '0');
    expect(guardar.disabled).toBe(true);
  });

  it('valida los problemas y el enlace opcional sin aceptar esquemas inseguros', async () => {
    const { root, escribir } = await abrir();
    const guardar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    await escribir('#problemas', '13 de 12');
    expect(guardar.disabled).toBe(true);
    await escribir('#problemas', '0 de 12');
    expect(guardar.disabled).toBe(false);
    await escribir('#respaldo', 'javascript:alert(1)');
    expect(guardar.disabled).toBe(true);
    await escribir('#respaldo', '');
    expect(guardar.disabled).toBe(false);
  });

  it('permite revisar una participación parcial sin afirmar que se guardó', async () => {
    const { root, escribir, estabilizar } = await abrir();
    await escribir('#puesto', '');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(true);
    const pendiente = root.querySelector<HTMLButtonElement>('button[mat-stroked-button]')!;
    expect(pendiente.disabled).toBe(false);
    pendiente.click();
    await estabilizar();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('no se han guardado ni publicado');
    expect(root.querySelector<HTMLInputElement>('#puesto')!.value).toBe('');
  });

  it('conserva las ediciones al mostrar el aviso de guardado pendiente de integración', async () => {
    const { root, escribir, estabilizar } = await abrir();
    await escribir('#competencia', 'Final universitaria');
    root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.click();
    await estabilizar();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Guardado de resultados no disponible');
    expect(root.querySelector<HTMLInputElement>('#competencia')!.value).toBe('Final universitaria');
    expect(root.querySelectorAll('article')).toHaveLength(2);
  });

  it('conecta el dashboard del coach con el formulario', async () => {
    const { root, harness, estabilizar } = await abrir('/coach/inicio');
    root.querySelector<HTMLAnchorElement>('a[href="/coach/competencias"]')!.click();
    await estabilizar();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Historial competitivo');
  });

  it('permite elegir la fecha en el calendario localizado en español', async () => {
    const { root, estabilizar } = await abrir();
    root.querySelector<HTMLButtonElement>('mat-datepicker-toggle button')!.click();
    await estabilizar();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector<HTMLButtonElement>('button[aria-label="30 de octubre de 2026"]')!.click();
    await estabilizar();
    expect(root.querySelector<HTMLInputElement>('#fecha')!.value).toBe('30/10/2026');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(false);
  });

  it('impide el acceso sin sesión y con rol practicante', async () => {
    const { harness } = await abrir();
    TestBed.inject(Session).logout();
    await harness.navigateByUrl('/coach/inicio');
    await harness.navigateByUrl('/coach/competencias');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).not.toContain('Historial competitivo');
    TestBed.inject(Session).startDemo('PRACTICANTE');
    await harness.navigateByUrl('/coach/competencias');
    expect(harness.routeNativeElement?.textContent).toContain('Hola, Camila');
    expect(harness.routeNativeElement?.querySelector('a[href="/coach/competencias"]')).toBeNull();
  });
});
