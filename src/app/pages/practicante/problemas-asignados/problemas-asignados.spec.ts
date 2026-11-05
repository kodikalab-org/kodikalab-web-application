import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProblemasAsignados } from './problemas-asignados';

describe('ProblemasAsignados', () => {
  let component: ProblemasAsignados;
  let fixture: ComponentFixture<ProblemasAsignados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemasAsignados],
    }).compileComponents();

    fixture = TestBed.createComponent(ProblemasAsignados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
