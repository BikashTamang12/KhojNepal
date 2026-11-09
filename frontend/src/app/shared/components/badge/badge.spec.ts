import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './badge';

describe('StatusBadge', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).compileComponents();
  });

  it('renders variant, size classes, role="status", and label text', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('variant', 'verified');
    fixture.componentRef.setInput('size', 'sm');
    fixture.componentRef.setInput('label', 'Approved');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('span.badge');
    expect(badge?.getAttribute('role')).toBe('status');
    expect(badge?.className).toContain('badge-verified');
    expect(badge?.className).toContain('badge-sm');
    expect(badge?.textContent?.trim()).toBe('Approved');
  });
});
