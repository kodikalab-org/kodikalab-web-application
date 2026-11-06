import { TestBed } from '@angular/core/testing';
import { ElegirDestinatarios } from './elegir-destinatarios';

describe('ElegirDestinatarios', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [ElegirDestinatarios] }).compileComponents();
    const fixture = TestBed.createComponent(ElegirDestinatarios);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  async function elegirAlgunos(fixture: Awaited<ReturnType<typeof setup>>['fixture']) {
    fixture.componentInstance.form.controls.tipo.setValue('algunos');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('ofrece todo el equipo o solo algunos integrantes', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Todo el equipo');
    expect(root.textContent).toContain('Solo algunos integrantes');
    expect(root.querySelectorAll('input[type="radio"]').length).toBe(2);
    expect(root.querySelector('mat-checkbox')).toBeNull();
  });

  it('muestra la lista de integrantes al elegir solo algunos', async () => {
    const { fixture, root } = await setup();
    await elegirAlgunos(fixture);
    expect(root.querySelectorAll('mat-checkbox').length).toBe(8);
    expect(root.textContent).toContain('Solicitud pendiente');
    expect(root.textContent).toContain('Retiró su membresía');
  });

  it('exige al menos un integrante marcado', async () => {
    const { fixture, root } = await setup();
    await elegirAlgunos(fixture);
    expect(fixture.componentInstance.form.valid).toBe(true);
    fixture.componentInstance.form.controls.integrantes.controls.forEach((c) => c.setValue(false));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(root.textContent).toContain('Selecciona al menos un integrante.');
  });
});
