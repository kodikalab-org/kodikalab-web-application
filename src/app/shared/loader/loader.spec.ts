import { TestBed } from '@angular/core/testing';
import { Loader } from './loader';

describe('Loader', () => {
  const create = (rows?: number) => {
    const fixture = TestBed.createComponent(Loader);
    fixture.componentRef.setInput('label', 'Loading teams');
    if (rows !== undefined) fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('announces its label as a status', () => {
    const host = create();
    expect(host.getAttribute('role')).toBe('status');
    expect(host.textContent?.trim()).toBe('Loading teams');
  });

  it('draws the requested placeholder rows, hidden from assistive technology', () => {
    const host = create(3);
    expect(host.querySelectorAll('.kl-skeleton').length).toBe(3);
    expect(host.querySelector('.kl-skeleton')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
