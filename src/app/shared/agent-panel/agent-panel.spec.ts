import { Component } from '@angular/core';
import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AgentChatStore } from '../../core/agent-chat-store';
import { API_URL } from '../../core/api';
import { Session } from '../../core/session';
import { AgentPanel } from './agent-panel';

@Component({ template: '' })
class Blank {}

describe('Floating agent panel', () => {
  let fixture: ComponentFixture<AgentPanel>;
  let session: Session;
  let http: HttpTestingController;
  let url: string;
  const root = () => fixture.nativeElement as HTMLElement;
  const toggle = () => root().querySelector<HTMLButtonElement>('[data-testid="agent-toggle"]');
  const dialog = () => root().querySelector('[role="dialog"]');

  async function open(path: string, signedIn = true) {
    if (signedIn) {
      session.account.set({ token: 't', email: 'c@kodikalab.test', role: 'COACH', expiresAt: Date.now() + 60_000 });
    }
    await TestBed.inject(Router).navigateByUrl(path);
    fixture = TestBed.createComponent(AgentPanel);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter(['', 'login', 'grupos', 'concursos', 'coach/asistente', 'onboarding/coach/experiencia']
        .map((path) => ({ path, component: Blank }))),
    ] });
    session = TestBed.inject(Session);
    session.logout();
    http = TestBed.inject(HttpTestingController);
    url = TestBed.inject(API_URL);
  });
  afterEach(() => { http.verify(); session.logout(); });

  for (const path of ['/', '/login', '/coach/asistente', '/onboarding/coach/experiencia']) {
    it(`stays hidden on ${path}`, async () => {
      await open(path);
      expect(toggle()).toBeNull();
    });
  }

  it('stays hidden without a session', async () => {
    await open('/grupos', false);
    expect(toggle()).toBeNull();
  });

  it('stays open with its conversation while the user changes page', async () => {
    await open('/grupos');
    toggle()!.click();
    await fixture.whenStable();
    http.expectOne(`${url}/teams/me`).flush([]);
    TestBed.inject(AgentChatStore).send('hola');
    http.expectOne(`${url}/agent/chat`).flush({ conversationId: 'c', agent: 'none', message: 'No puedo ayudarte' });

    await TestBed.inject(Router).navigateByUrl('/concursos');
    await fixture.whenStable();

    expect(dialog()?.textContent).toContain('No puedo ayudarte');
  });

  it('closes with Escape', async () => {
    await open('/grupos');
    toggle()!.click();
    await fixture.whenStable();
    http.expectOne(`${url}/teams/me`).flush([]);

    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(toggle()).not.toBeNull();
  });

  it('explains how to recover when the assistant chunk fails to load', async () => {
    // Rebuild the module: the manual defer behavior cannot be set once the outer setup has injected.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual, providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'grupos', component: Blank }]),
    ] });
    session = TestBed.inject(Session);
    http = TestBed.inject(HttpTestingController);
    await open('/grupos');
    toggle()!.click();
    await fixture.whenStable();
    const [block] = await fixture.getDeferBlocks();

    await block.render(DeferBlockState.Error);

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el asistente');
  });
});
