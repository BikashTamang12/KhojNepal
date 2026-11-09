import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  type UserProfileWithStats,
  extractErrorMessage,
  formatShortDate,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { UserService } from '../../services/user';

function passwordConfirmationValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const next = control.get('newPassword')?.value as string | undefined;
  const confirm = control.get('confirmPassword')?.value as string | undefined;
  if (!next || !confirm) return null;
  return next === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    FormInput,
    Button,
    Icon,
    Loading,
    ErrorState,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly profile = signal<UserProfileWithStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    ],
    phone: ['', [Validators.maxLength(20)]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(100)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordConfirmationValidator },
  );

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getMyProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.profileForm.patchValue({
          fullName: data.fullName,
          phone: data.phone ?? '',
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Failed to load profile.'));
        this.loading.set(false);
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    const { fullName, phone } = this.profileForm.getRawValue();
    this.userService.updateProfile({ fullName, phone }).subscribe({
      next: (updated) => {
        this.savingProfile.set(false);
        this.profile.update((p) => (p ? { ...p, ...updated } : null));
        this.toastService.success('Profile updated successfully.');
      },
      error: (err: unknown) => {
        this.savingProfile.set(false);
        this.toastService.error(extractErrorMessage(err, 'Failed to update profile.'));
      },
    });
  }

  updatePassword(): void {
    this.passwordError.set(null);
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toastService.success(res.message || 'Password updated successfully.');
      },
      error: (err: unknown) => {
        this.savingPassword.set(false);
        this.passwordError.set(
          extractErrorMessage(err, 'Could not change password.'),
        );
      },
    });
  }

  getPasswordError(): string {
    if (
      this.passwordForm.hasError('mismatch') &&
      this.passwordForm.controls.confirmPassword.touched
    ) {
      return 'New passwords do not match.';
    }
    return '';
  }

  formatDate(val?: string): string {
    return formatShortDate(val);
  }
}
