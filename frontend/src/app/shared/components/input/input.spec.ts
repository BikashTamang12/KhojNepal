import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { FormInput } from './input';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormInput],
  template: `
    <app-input
      id="email-field"
      label="Email Address"
      type="email"
      [required]="true"
      hint="We never share your email."
      [error]="errorText"
      [formControl]="ctrl"
    />
  `,
})
class InputHostComponent {
  ctrl = new FormControl('initial@example.com');
  errorText = '';
}

describe('FormInput', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputHostComponent],
    }).compileComponents();
  });

  it('supports ControlValueAccessor two-way sync and accessible label attributes', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('label');
    const input = el.querySelector('input') as HTMLInputElement;

    expect(el.querySelectorAll('#email-field')).toHaveLength(1);
    expect(label?.getAttribute('for')).toBe('email-field');
    expect(label?.textContent).toContain('Email Address');
    expect(el.querySelector('.required-mark')).toBeTruthy();
    expect(input.value).toBe('initial@example.com');
    expect(input.getAttribute('aria-describedby')).toBe('email-field-hint');

    input.value = 'updated@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.ctrl.value).toBe('updated@example.com');
  });

  it('switches to error state with aria-invalid and handles disabled state', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.componentInstance.errorText = 'Valid email required.';
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input') as HTMLInputElement;

    expect(input.disabled).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-field-error');
    expect(el.querySelector('#email-field-error')?.textContent?.trim()).toBe(
      'Valid email required.',
    );
  });
});
