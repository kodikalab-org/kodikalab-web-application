import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  async function render(coach: boolean) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AppHeader);
    fixture.componentRef.setInput('coach', coach);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('omits the notifications and dark-mode icons', async () => {
    const root = await render(false);
    expect(root.querySelector('img[alt="Notificaciones pendientes"]')).toBeNull();
    expect(root.querySelector('img[alt="Tema oscuro"]')).toBeNull();
  });

  it('renders the user menu', async () => {
    const root = await render(false);
    expect(root.querySelector('app-user-menu')).not.toBeNull();
    expect(root.querySelector('[aria-label="Abrir menú de usuario"]')).not.toBeNull();
  });

  it('links the logo to /coach/inicio for the coach', async () => {
    const root = await render(true);
    expect(root.querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/coach/inicio');
  });

  it('links the logo to /inicio for the practitioner', async () => {
    const root = await render(false);
    expect(root.querySelector('a[aria-label="Kodikalab, inicio"]')?.getAttribute('href')).toBe('/inicio');
  });
});
