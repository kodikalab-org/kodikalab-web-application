import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AgentChatStore } from './agent-chat-store';
import { API_URL } from './api';
import { Session } from './session';

describe('Agent chat store', () => {
  let session: Session;
  let store: AgentChatStore;
  let http: HttpTestingController;
  let url: string;

  const signIn = (email: string) => {
    session.account.set({ token: 't', email, role: 'COACH', expiresAt: Date.now() + 60_000 });
    TestBed.tick();
  };
  const chat = () => http.expectOne(`${url}/agent/chat`);
  const answer = { conversationId: '7f2c1d9e-5b0a-4c3f-9a51-2f6f0d1b8e44', agent: 'insights', message: 'Listo' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(Session);
    session.logout();
    store = TestBed.inject(AgentChatStore);
    http = TestBed.inject(HttpTestingController);
    url = TestBed.inject(API_URL);
    signIn('coach@kodikalab.test');
  });
  afterEach(() => { http.verify(); session.logout(); });

  it('sends the selected team and keeps the conversation id for the next message', () => {
    store.teamId.set(10);
    store.send('  ¿En qué estamos débiles?  ');
    const first = chat();
    expect(first.request.body).toEqual({ message: '¿En qué estamos débiles?', teamId: 10 });
    first.flush(answer);

    store.teamId.set(null);
    store.send('Recomienda problemas');
    const second = chat();
    expect(second.request.body).toEqual({ message: 'Recomienda problemas', conversationId: answer.conversationId });
    second.flush(answer);

    expect(store.messages().map((item) => item.author)).toEqual(['user', 'agent', 'user', 'agent']);
    expect(store.messages()[1].response?.agent).toBe('insights');
  });

  it('ignores blank messages and a second message while one is in flight', () => {
    expect(store.send('   ')).toBe(false);
    expect(store.send('uno')).toBe(true);
    expect(store.send('dos')).toBe(false);
    expect(store.sending()).toBe(true);
    chat().flush(answer);
    expect(store.sending()).toBe(false);
  });

  for (const [status, message] of [[429, 'Demasiados mensajes'], [503, 'El asistente de IA está desactivado']] as const) {
    it(`shows the server explanation for a ${status}`, () => {
      store.send('hola');
      chat().flush({ message, errors: {} }, { status, statusText: 'Error' });
      expect(store.error()).toBe(message);
      expect(store.sending()).toBe(false);
    });
  }

  it('reports a connection problem when there is no answer', () => {
    store.send('hola');
    chat().error(new ProgressEvent('error'));
    expect(store.error()).toContain('No pudimos conectar');
  });

  it('drops the conversation and any pending answer when the account changes', () => {
    store.teamId.set(10);
    store.send('hola');
    const pending = chat();
    signIn('other@kodikalab.test');

    expect(store.messages()).toEqual([]);
    expect(store.teamId()).toBeNull();
    expect(store.sending()).toBe(false);
    expect(pending.cancelled).toBe(true);
  });

  it('starts over with a new conversation', () => {
    store.send('hola');
    chat().flush(answer);
    store.reset();
    store.send('de nuevo');
    const next = chat();
    expect(next.request.body).toEqual({ message: 'de nuevo' });
    next.flush(answer);
  });

  it('never calls the API in a demo', () => {
    session.startDemo('COACH');
    TestBed.tick();
    expect(store.send('hola')).toBe(false);
    expect(store.error()).toContain('Demostración');
    http.expectNone(`${url}/agent/chat`);
  });
});
