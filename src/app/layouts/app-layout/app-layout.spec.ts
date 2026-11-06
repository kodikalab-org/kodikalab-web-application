import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppLayout } from './app-layout';

describe('AppLayout', () => {
  it('muestra la cabecera, el buscador y el pie de página', async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('header, mat-toolbar')).not.toBeNull();
    expect(root.querySelector('input[type="search"]')).not.toBeNull();
    expect(root.querySelector('footer')).not.toBeNull();
    expect(root.textContent).toContain('Problemas');
  });
});
