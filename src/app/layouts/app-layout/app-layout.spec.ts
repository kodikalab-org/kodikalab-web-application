import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppLayout } from './app-layout';

describe('AppLayout', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra la cabecera de la app y el pie de página', async () => {
    const root = await crear();
    expect(root.querySelector('header mat-toolbar')).not.toBeNull();
    expect(root.querySelector('app-user-menu')).not.toBeNull();
    expect(root.querySelector('footer')).not.toBeNull();
  });

  it('no incluye icono de notificaciones ni conmutador de tema', async () => {
    const root = await crear();
    const etiquetas = Array.from(root.querySelectorAll('[aria-label], [alt]')).map(
      (el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('alt') ?? ''}`.toLowerCase(),
    );
    expect(etiquetas.some((e) => e.includes('notificaciones') || e.includes('tema'))).toBe(false);
  });
});
