import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentChatStore } from '../../core/agent-chat-store';
import { API_URL, Role } from '../../core/api';
import { Session } from '../../core/session';
import { AgentChat } from './agent-chat';

describe('Agent chat', () => {
  let session: Session;
  let http: HttpTestingController;
  let url: string;

  async function render(role: Role) {
    session.account.set({ token: 't', email: 'u@kodikalab.test', role, expiresAt: Date.now() + 60_000 });
    TestBed.tick();
    const fixture = TestBed.createComponent(AgentChat);
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(Session);
    session.logout();
    http = TestBed.inject(HttpTestingController);
    url = TestBed.inject(API_URL);
  });
  afterEach(() => { http.verify(); session.logout(); });

  it('preselects the first coach team that has members', async () => {
    await render('COACH');
    http.expectOne(`${url}/teams/me`).flush([
      { groupId: 4, name: 'Sin gente', activeMembers: 0 },
      { groupId: 10, name: 'Equipo Demo', activeMembers: 1 },
    ]);
    expect(TestBed.inject(AgentChatStore).teamId()).toBe(10);
  });

  it('does not ask a practitioner for a team', async () => {
    const fixture = await render('PRACTICANTE');
    http.expectNone(`${url}/teams/me`);
    expect((fixture.nativeElement as HTMLElement).querySelector('mat-select')).toBeNull();
  });

  it('draws the figures and problem cards exactly as the server sends them', async () => {
    const fixture = await render('PRACTICANTE');
    TestBed.inject(AgentChatStore).send('Recomienda');
    http.expectOne(`${url}/agent/chat`).flush({
      conversationId: 'c', agent: 'insights', message: 'Mira las propuestas',
      chart: { title: 'Cobertura por tema', unit: '%', labels: ['graphs', 'dp'], values: [0, 33.33] },
      problems: [{ problemId: null, title: 'Badge', url: 'https://codeforces.com/problemset/problem/1020/B',
        topic: 'graphs', difficulty: '1000', reason: 'Tema graphs', source: 'CODEFORCES' }],
    });
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Mira las propuestas');
    expect(root.textContent).toContain('33.33%');
    const link = root.querySelector<HTMLAnchorElement>('a[target="_blank"]')!;
    expect(link.href).toBe('https://codeforces.com/problemset/problem/1020/B');
    expect(link.rel).toContain('noopener');
    expect(root.textContent).toContain('Codeforces');
  });

  async function answer(extra: Record<string, unknown>) {
    const fixture = await render('PRACTICANTE');
    TestBed.inject(AgentChatStore).send('Consulta');
    http.expectOne(`${url}/agent/chat`).flush({ conversationId: 'c', agent: 'insights', message: 'Listo', ...extra });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const widths = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLElement>('figure .kl-bar')).map((bar) => bar.style.width);

  it('keeps chart bars within 0-100 and never prints missing values', async () => {
    const root = await answer({
      chart: { title: 'Cobertura', unit: '%', labels: ['negative', 'empty', 'over', 'missing'], values: [-5, null, 140] },
    });
    expect(widths(root)).toEqual(['0%', '0%', '100%', '0%']);
    expect(root.querySelector('figure')!.textContent).not.toMatch(/null|undefined|NaN/);
    expect(root.querySelector('figure')!.textContent).toContain('Sin dato');
  });

  it('scales count charts when one of the values is missing', async () => {
    const root = await answer({ chart: { title: 'Resueltos', unit: '', labels: ['dp', 'graphs'], values: [4] } });
    expect(widths(root)).toEqual(['100%', '0%']);
  });

  it('says there is no data instead of drawing an empty chart', async () => {
    const root = await answer({ chart: { title: 'Cobertura', unit: '%', labels: [], values: [] } });
    expect(root.querySelector('figure')!.textContent).toContain('Sin datos para mostrar.');
  });

  it('omits the missing level or schedule of a found team without a stray separator', async () => {
    const root = await answer({
      teams: [
        { groupId: 1, name: 'Sin datos', expectedLevel: null, sessionSchedule: null, differences: [] },
        { groupId: 2, name: 'Solo horario', expectedLevel: null, sessionSchedule: 'Lunes', differences: [] },
      ],
    });
    const log = root.querySelector('[role="log"]')!.textContent!;
    expect(log).not.toContain('\u00b7');
    expect(log).toContain('Lunes');
  });
});
