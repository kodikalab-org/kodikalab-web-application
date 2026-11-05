import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElegirDestinatarios } from './elegir-destinatarios';

describe('ElegirDestinatarios', () => {
  let component: ElegirDestinatarios;
  let fixture: ComponentFixture<ElegirDestinatarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElegirDestinatarios],
    }).compileComponents();

    fixture = TestBed.createComponent(ElegirDestinatarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
