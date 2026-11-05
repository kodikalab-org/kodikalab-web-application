import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsignarProblema } from './asignar-problema';

describe('AsignarProblema', () => {
  let component: AsignarProblema;
  let fixture: ComponentFixture<AsignarProblema>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarProblema],
    }).compileComponents();

    fixture = TestBed.createComponent(AsignarProblema);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
