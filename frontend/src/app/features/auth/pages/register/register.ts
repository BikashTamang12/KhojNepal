import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';
import { AuthService } from '../../services/auth';

function passwordsMatchValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirm = control.get('confirmPassword')?.value as string | undefined;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormInput, Button, Icon],
  templateUrl: './register.html',
  styleUrl: '../login/login.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(150)],
      ],
      phone: ['', [Validators.maxLength(20)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(100),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  getFieldError(
    field: 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword',
  ): string {
    const control = this.form.controls[field];
    if (!control.touched && !control.dirty) {
      return '';
    }
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (control.hasError('email')) {
      return 'Please enter a valid email address.';
    }
    if (control.hasError('minlength')) {
      const req = control.getError('minlength') as { requiredLength: number };
      return `Must be at least ${req.requiredLength} characters.`;
    }
    if (control.hasError('maxlength')) {
      const req = control.getError('maxlength') as { requiredLength: number };
      return `Cannot exceed ${req.requiredLength} characters.`;
    }
    if (field === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }
    return '';
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { fullName, email, phone, password } = this.form.getRawValue();

    this.authService.register({ fullName, email, phone, password }).subscribe({
      next: ({ user }) => {
        this.submitting.set(false);
        this.toastService.success(
          `Account created! Welcome to KhojNepal, ${user.fullName}.`,
          'Registration Complete',
        );
        void this.router.navigateByUrl('/items/my', { replaceUrl: true });
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          extractErrorMessage(err, 'Could not complete registration.'),
        );
      },
    });
  }
}
