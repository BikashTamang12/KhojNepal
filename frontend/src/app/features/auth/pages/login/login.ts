import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormInput, Button, Icon],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  getFieldError(field: 'email' | 'password'): string {
    const control = this.form.controls[field];
    if (!control.touched && !control.dirty) {
      return '';
    }
    if (control.hasError('required')) {
      return field === 'email'
        ? 'Email address is required.'
        : 'Password is required.';
    }
    if (control.hasError('email')) {
      return 'Please enter a valid email address.';
    }
    if (control.hasError('minlength')) {
      return 'Password must be at least 6 characters.';
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
    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: ({ user }) => {
        this.submitting.set(false);
        this.toastService.success(`Welcome back, ${user.fullName}!`, 'Signed In');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = user.role === 'ADMIN' ? '/admin' : '/items/my';
        void this.router.navigateByUrl(
          returnUrl && returnUrl.startsWith('/') ? returnUrl : fallback,
        );
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          extractErrorMessage(err, 'Invalid email or password.'),
        );
      },
    });
  }
}
