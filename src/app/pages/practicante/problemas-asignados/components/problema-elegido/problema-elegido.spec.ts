import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProblemaElegido } from './problema-elegido';

describe('ProblemaElegido', () => {
  let component: ProblemaElegido;
  let fixture: ComponentFixture<ProblemaElegido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemaElegido],
    }).compileComponents();

    fixture = TestBed.createComponent(ProblemaElegido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
