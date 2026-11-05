import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Session } from '../../core/session';

describe('Interfaces de grupos', () => {
  afterEach(() => TestBed.inject(Session).logout());
  async function abrir(url: string) {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(Session).startDemo(url.startsWith('/coach/') ? 'COACH' : 'PRACTICANTE');
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement!;
    const estabilizar = async () => {
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    const escribir = async (id: string, valor: string) => {
      const campo = root.querySelector<HTMLInputElement>(id)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      campo.dispatchEvent(new Event('blur'));
      await estabilizar();
    };
    return { harness, root, estabilizar, escribir };
  }

  it('muestra seis grupos fijos y avisa que los filtros no buscan', async () => {
    const { root, escribir } = await abrir('/grupos');
    expect(root.querySelectorAll('mat-card').length).toBe(6);
    await escribir('#buscar-grupos', 'Sin coincidencias');
    expect(root.querySelectorAll('mat-card').length).toBe(6);
    expect(root.textContent).toContain('sin búsqueda ni filtrado real');
  });

  it('requiere nombre, nivel y cupo antes de continuar', async () => {
    const { root, escribir } = await abrir('/coach/grupos/crear');
    const continuar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    expect(continuar.disabled).toBe(true);
    expect(root.querySelector('mat-error')).toBeNull();
    await escribir('#grupo-nombre', ' ');
    expect(root.querySelector('mat-error')?.textContent).toContain('Ingresa un nombre');
    await escribir('#grupo-nombre', 'Entrenamiento de Grafos');
    await escribir('#grupo-cupo', '1001');
    expect(root.textContent).toContain('Entre 1 y 1000 integrantes.');
    expect(continuar.disabled).toBe(true);
  });

  it('conserva el formulario al avanzar, volver y usar Editar', async () => {
    const { root, harness, escribir, estabilizar } = await abrir('/coach/grupos/crear');
    await escribir('#grupo-nombre', 'Grupo de prueba');
    await escribir('#grupo-cupo', '15');
    root.querySelector<HTMLElement>('mat-select')!.click();
    await estabilizar();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    Array.from(overlay.querySelectorAll<HTMLElement>('mat-option'))
      .find((option) => option.textContent?.includes('Intermedio'))!
      .click();
    await estabilizar();
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(false);
    await harness.navigateByUrl('/coach/grupos/crear?paso=4');
    expect(root.textContent).toContain('Grupo de prueba');
    root.querySelector<HTMLAnchorElement>('a[href="/coach/grupos/crear?paso=1"]')!.click();
    await estabilizar();
    expect(root.querySelector<HTMLInputElement>('#grupo-nombre')!.value).toBe('Grupo de prueba');
    expect(root.querySelector<HTMLInputElement>('#grupo-cupo')!.value).toBe('15');
  });

  it('valida que la hora de fin sea posterior al inicio', async () => {
    const { root, escribir } = await abrir('/coach/grupos/crear?paso=2');
    const continuar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    expect(continuar.disabled).toBe(false);
    await escribir('#hora-fin', '18:00');
    expect(continuar.disabled).toBe(true);
    expect(root.textContent).toContain('La hora de fin debe ser posterior');
    await escribir('#hora-fin', '21:00');
    expect(continuar.disabled).toBe(false);
  });

  it('no permite crear desde un resumen incompleto abierto directamente', async () => {
    const { root } = await abrir('/coach/grupos/crear?paso=4');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(true);
    expect(root.querySelectorAll('a').length).toBeGreaterThan(3);
    expect(root.textContent).toContain('no se creará un grupo real');
  });

  it('mantiene el paso inicial ante parámetros no válidos', async () => {
    const { root } = await abrir('/coach/grupos/crear?paso=99');
    expect(root.querySelector('#grupo-nombre')).not.toBeNull();
  });

  it('abre la solicitud con código opcional y valida su formato', async () => {
    const { root, escribir } = await abrir('/grupos?vista=solicitar');
    expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('main')?.hasAttribute('inert')).toBe(true);
    const solicitar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    expect(solicitar.disabled).toBe(false);
    await escribir('#invitacion', 'abc');
    expect(solicitar.disabled).toBe(true);
    expect(root.textContent).toContain('12 letras o números');
    await escribir('#invitacion', 'A1B2C3D4E5F6');
    expect(solicitar.disabled).toBe(false);
  });

  it('exige código en el acceso por invitación', async () => {
    const { root, escribir } = await abrir('/grupos?vista=codigo');
    const ingresar = root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!;
    expect(ingresar.disabled).toBe(true);
    await escribir('#invitacion', 'A1B2C3D4E5F6');
    expect(ingresar.disabled).toBe(false);
  });

  it('muestra la confirmación de ejemplo sin crear otra ruta de estado', async () => {
    const { root } = await abrir('/grupos?vista=enviada');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Solicitud enviada');
    expect(root.textContent).toContain('sin operación real');
  });

  it('conserva el grupo seleccionado al abrir una confirmación de ingreso', async () => {
    const { root } = await abrir('/grupos?vista=ingreso&grupo=DH');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain(
      'Ingresaste a Desarrollo de Habilidades Competitivas',
    );
  });

  it('reutiliza el dashboard coach al revisar y aceptar una solicitud', async () => {
    const { root, harness } = await abrir('/coach/grupos/solicitudes');
    expect(root.querySelector('app-inicio-dashboard')?.textContent).toContain('Hola, Marco');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Valeria Núñez');
    expect(root.querySelector('[role="dialog"]')?.textContent).not.toContain('@upc.edu.pe');
    await harness.navigateByUrl('/coach/grupos/solicitudes?vista=aceptada');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Solicitud aceptada');
    expect(root.textContent).toContain('no se registra ninguna decisión');
  });

  it('valida la observación y conserva la postulación pendiente', async () => {
    const { root, escribir, harness } = await abrir('/coach/grupos/seguimiento');
    await escribir('#observacion', ' ');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(true);
    expect(root.textContent).toContain('Ingresa una observación');
    await escribir('#observacion', 'Confirma tu disponibilidad');
    expect(root.querySelector<HTMLButtonElement>('button[mat-flat-button]')!.disabled).toBe(false);
    await harness.navigateByUrl('/coach/grupos/seguimiento?vista=guardado');
    expect(root.textContent).toContain('Aclaración solicitada');
    expect(root.textContent).toContain('Postulación pendiente');
    expect(root.querySelector<HTMLTextAreaElement>('#observacion')!.readOnly).toBe(true);
  });

  it('identifica como estática la confirmación y el código del grupo', async () => {
    const { root } = await abrir('/coach/grupos/creado');
    expect(root.textContent).toContain('¡Grupo creado!');
    expect(root.textContent).toContain('A1B2C3D4E5F6');
    expect(root.textContent).toContain('el código es estático');
  });
});
