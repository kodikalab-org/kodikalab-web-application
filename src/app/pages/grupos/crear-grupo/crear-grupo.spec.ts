import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CrearGrupo } from './crear-grupo';
import { CreateGroupRequest, CreateGroupResponse, TeamsApi } from '../../../core/teams-api';
import { signal } from '@angular/core';

const BORRADOR = {
  groupId: 5,
  name: 'Borrador de DP',
  description: 'Programación dinámica',
  expectedLevel: 'AVANZADO',
  maxCapacity: 12,
  sessionSchedule: 'Lun, Mié de 18:00 a 20:00',
  status: 'BORRADOR',
  visibility: 'PROTEGIDO',
  invitationCode: 'ABCDEF123456',
  activeMembers: 0,
  pendingRequests: 0,
};

class TeamsStub {
  readonly lastCreated = signal<CreateGroupResponse | null>(null);
  readonly calls = {
    create: [] as CreateGroupRequest[],
    update: [] as { id: number; body: Partial<CreateGroupRequest> }[],
    publish: [] as number[],
  };
  loadMine() {
    return of([BORRADOR]);
  }
  create(body: CreateGroupRequest) {
    this.calls.create.push(body);
    return of({ message: 'x', groupId: 9, name: body.name, status: 'BORRADOR', invitationCode: 'X' });
  }
  updateDraft(id: number, body: Partial<CreateGroupRequest>): Observable<typeof BORRADOR> {
    this.calls.update.push({ id, body });
    return of({ ...BORRADOR, name: body.name ?? BORRADOR.name });
  }
  publish(id: number) {
    this.calls.publish.push(id);
    return of({ ...BORRADOR, status: 'ACTIVO' });
  }
}

function setup(query: Record<string, string>) {
  const stub = new TeamsStub();
  TestBed.configureTestingModule({
    imports: [CrearGrupo],
    providers: [
      provideRouter([]),
      { provide: TeamsApi, useValue: stub },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(query) },
          queryParamMap: of(convertToParamMap(query)),
        },
      },
    ],
  });
  const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { stub, navigation, fixture: TestBed.createComponent(CrearGrupo) };
}

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('Continuar un borrador', () => {
  it('carga el borrador del coach y lo actualiza con updateDraft sin crear otro grupo', async () => {
    const { stub, navigation, fixture } = setup({ borrador: '5' });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Estás continuando un borrador');
    expect((root.querySelector('#grupo-nombre') as HTMLInputElement).value).toBe('Borrador de DP');

    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Guardar borrador'))!.click();
    await settle(fixture);

    expect(stub.calls.create).toEqual([]);
    expect(stub.calls.update).toHaveLength(1);
    expect(stub.calls.update[0].id).toBe(5);
    expect(stub.calls.update[0].body).toMatchObject({
      name: 'Borrador de DP',
      expectedLevel: 'AVANZADO',
      maxCapacity: 12,
      visibility: 'PROTEGIDO',
      sessionSchedule: 'Lun, Mié de 18:00 a 20:00',
    });
    expect('draft' in stub.calls.update[0].body).toBe(false);
    expect(stub.lastCreated()).toMatchObject({ groupId: 5, status: 'BORRADOR' });
    expect(navigation).toHaveBeenCalledWith(['/coach/grupos/creado']);
  });

  it('avisa cuando el borrador no existe y deja crear uno nuevo', async () => {
    const { stub, fixture } = setup({ borrador: '77' });
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No encontramos ese borrador');
    expect(stub.calls.update).toEqual([]);
  });
});
