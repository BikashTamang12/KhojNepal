import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  standalone: true,
  imports: [Button],
  template: `
    <app-button
      variant="danger"
      size="lg"
      [fullWidth]="true"
      [loading]="loading()"
      [disabled]="disabled()"
    >
      Submit Claim
    </app-button>
  `,
})
class TestHostComponent {
  readonly loading = signal(false);
  readonly disabled = signal(false);
}

describe('Button', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button, TestHostComponent],
    }).compileComponents();
  });

  it('renders variant, size, full-width class, and projected content', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn?.className).toContain('btn-danger');
    expect(btn?.className).toContain('btn-lg');
    expect(btn?.className).toContain('btn-full');
    expect(btn?.textContent?.trim()).toBe('Submit Claim');
    expect(btn?.disabled).toBe(false);
  });

  it('disables button and shows spinner when loading or disabled', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('button');
    expect(btn?.disabled).toBe(true);
    expect(el.querySelector('.btn-spinner')).toBeTruthy();

    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(btn?.disabled).toBe(true);
    expect(el.querySelector('.btn-spinner')).toBeNull();
  });
});
