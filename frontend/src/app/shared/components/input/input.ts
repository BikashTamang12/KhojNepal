import { Component, Input, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'search'
  | 'tel'
  | 'url'
  | 'date'
  | 'datetime-local';

let nextInputId = 0;

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.html',
  styleUrl: './input.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInput),
      multi: true,
    },
  ],
})
export class FormInput implements ControlValueAccessor {
  private readonly fallbackId = `app-input-${++nextInputId}`;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  @Input() id = '';
  @Input() name = '';
  @Input() label = '';
  @Input() type: InputType = 'text';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() autocomplete = '';
  @Input() max = '';
  @Input() min = '';
  @Input() required = false;
  @Input() disabled = false;

  get controlId(): string {
    return this.id || this.name || this.fallbackId;
  }

  writeValue(value: string | number | null | undefined): void {
    this.value = value === null || value === undefined ? '' : String(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const nextValue = target?.value ?? '';
    this.value = nextValue;
    this.onChange(nextValue);
  }

  onInputBlur(): void {
    this.onTouched();
  }
}
