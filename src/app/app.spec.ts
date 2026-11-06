import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the router outlet without a private-session banner on a public page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('aside')).toBeNull();
  });

  it('leaves the group requests header to the shared group layout', async () => {
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/coach/grupos/solicitudes');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('header')).toBeNull();
    expect(root.querySelector('router-outlet')).not.toBeNull();
    expect(root.firstElementChild?.classList.contains('overflow-clip')).toBe(true);
  });

  it('has no sidebar drawer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-sidenav')).toBeNull();
    expect(compiled.querySelector('mat-sidenav-container')).toBeNull();
  });
});
