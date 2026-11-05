import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroProblemasResueltos } from './registro-problemas-resueltos';

describe('RegistroProblemasResueltos', () => {
  let component: RegistroProblemasResueltos;
  let fixture: ComponentFixture<RegistroProblemasResueltos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroProblemasResueltos],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroProblemasResueltos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
