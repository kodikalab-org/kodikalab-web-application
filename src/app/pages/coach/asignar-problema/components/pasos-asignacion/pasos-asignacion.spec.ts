import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PasosAsignacion } from './pasos-asignacion';

@Component({
  imports: [PasosAsignacion],
  template: '<app-pasos-asignacion [paso]="2" />',
})
class Host {}

describe('PasosAsignacion', () => {
  it('marks the current step, shows the previous ones as completed and leaves the next one pending', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const items = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));
    expect(items.length).toBe(3);
    expect(items[0].querySelector('img[alt="Completado"]')).not.toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[1].textContent).toContain('Configurar asignación');
    expect(items[2].getAttribute('aria-current')).toBeNull();
    expect(items[2].querySelector('img')).toBeNull();
  });
});
