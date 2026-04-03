import { ChangeDetectionStrategy, Component, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemSettingsService } from '../../../../core/services/system-settings.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AddOrganizerFormData {
  userId: string;
}

@Component({
  selector: 'app-add-authorized-organizer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
  templateUrl: './add-authorized-organizer-modal.component.html',
  styleUrls: ['./add-authorized-organizer-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAuthorizedOrganizerModalComponent {
  private readonly systemSettingsService = inject(SystemSettingsService);

  readonly closed = output<void>();
  readonly success = output<void>();

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly selectedUserId = signal<string>('');

  readonly filteredUsers = signal<User[]>([]);

  constructor() {
    effect(() => {
      this.loadUsers();
    });

    effect(() => {
      const users = this.users();
      const searchTerm = this.selectedUserId();

      if (!searchTerm) {
        this.filteredUsers.set(users);
      } else {
        const filtered = users.filter(
          (user) =>
            user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        this.filteredUsers.set(filtered);
      }
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.systemSettingsService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.filteredUsers.set(users);
        this.loading.set(false);
      },
      error: (_error) => {
        console.error('Failed to load users');
        this.loading.set(false);
      },
    });
  }

  protected selectUser(userId: string): void {
    this.selectedUserId.set(userId);
  }

  protected onSubmit(): void {
    const userId = this.selectedUserId();
    if (!userId) {
      return;
    }

    this.submitting.set(true);

    const data: AddOrganizerFormData = {
      userId,
    };

    this.systemSettingsService.addAuthorizedOrganizer(data).subscribe({
      next: () => {
        this.submitting.set(false);
        this.resetForm();
        this.success.emit();
      },
      error: (_error) => {
        console.error('Failed to add authorized organizer');
        this.submitting.set(false);
      },
    });
  }

  protected onCancel(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.selectedUserId.set('');
  }
}
