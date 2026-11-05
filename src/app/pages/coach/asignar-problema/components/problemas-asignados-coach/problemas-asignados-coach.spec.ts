import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProblemasAsignadosCoach } from './problemas-asignados-coach';

describe('ProblemasAsignadosCoach', () => {
  let component: ProblemasAsignadosCoach;
  let fixture: ComponentFixture<ProblemasAsignadosCoach>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemasAsignadosCoach],
    }).compileComponents();

    fixture = TestBed.createComponent(ProblemasAsignadosCoach);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
