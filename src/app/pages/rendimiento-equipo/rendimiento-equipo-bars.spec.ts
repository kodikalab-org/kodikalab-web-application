import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from '../../core/session';
import { RendimientoEquipo } from './rendimiento-equipo';

describe('Team performance bars', () => {
  afterEach(() => TestBed.inject(Session).logout());

  it('marks the weakest topic with a class the shared bar gradient leaves alone', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'r', component: RendimientoEquipo }]), provideHttpClient()],
    });
    TestBed.inject(Session).demo.set('COACH');
    const harness = await RouterTestingHarness.create('/r');
    await harness.fixture.whenStable();
    const bars = [...harness.routeNativeElement!.querySelectorAll<HTMLElement>('.kl-bar')];
    expect(bars[0].className).toContain('amber');
    expect(bars[1].className).not.toContain('amber');
  });
});
