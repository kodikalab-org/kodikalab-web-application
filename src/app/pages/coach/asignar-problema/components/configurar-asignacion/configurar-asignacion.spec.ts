import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigurarAsignacion } from './configurar-asignacion';

describe('ConfigurarAsignacion', () => {
  let component: ConfigurarAsignacion;
  let fixture: ComponentFixture<ConfigurarAsignacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurarAsignacion],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigurarAsignacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
