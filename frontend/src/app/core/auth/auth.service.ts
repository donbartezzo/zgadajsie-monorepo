import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/types';
import { NotificationService } from '../services/notification.service';
import { ProfileBroadcastService } from '../services/profile-broadcast.service';
import { Role } from '@zgadajsie/shared';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse extends AuthTokens {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);
  private readonly apiUrl = environment.apiUrl + '/auth';

  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === Role.ADMIN);
  isActive = computed(() => this.currentUser()?.isActive ?? false);

  constructor() {
    // Subscribe to profile changes broadcast
    this.profileBroadcast.changes$.subscribe((change) => {
      if (change.type === 'user') {
        const currentUser = this.currentUser();
        if (currentUser && currentUser.id === change.userId) {
          // Update current user with new data
          this.currentUser.set({ ...currentUser, ...change.changes });
        }
      }
    });
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/register`, { email, password, displayName }),
    );
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }),
    );
    this.setTokens(res);
    this.currentUser.set(res.user);
    this.notificationService.initPushSubscription();
  }

  async logout(): Promise<void> {
    this.clearTokens();
    this.currentUser.set(null);
    await this.router.navigate(['/auth/login']);
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await firstValueFrom(
        this.http.post<AuthTokens>(`${this.apiUrl}/refresh`, { refreshToken }),
      );
      this.setTokens(res);
      return res.accessToken;
    } catch {
      this.clearTokens();
      this.currentUser.set(null);
      return null;
    }
  }

  async fetchUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<User>(`${environment.apiUrl}/users/me`));
      this.currentUser.set(user);
    } catch {
      this.clearTokens();
      this.currentUser.set(null);
    }
  }

  async activateAccount(token: string): Promise<void> {
    await firstValueFrom(this.http.get(`${this.apiUrl}/activate?token=${token}`));
  }

  async resendActivation(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/resend-activation`, {}));
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/forgot-password`, { email }));
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword }));
  }

  async handleSocialCallback(accessToken: string, refreshToken: string): Promise<void> {
    this.setTokens({ accessToken, refreshToken });
    await this.fetchUser();
    this.notificationService.initPushSubscription();
  }

  getSocialLoginUrl(provider: 'google' | 'facebook'): string {
    return `${environment.apiUrl}/auth/${provider}`;
  }

  async initOnAppStart(): Promise<void> {
    const token = this.getAccessToken();
    if (token) {
      await this.fetchUser();
      if (this.isLoggedIn()) {
        this.notificationService.initPushSubscription();
      }
    }
  }

  updateUser(userData: Partial<User>): void {
    const currentUser = this.currentUser();
    if (currentUser) {
      this.currentUser.set({ ...currentUser, ...userData });
    }
  }

  async refreshCurrentUser(): Promise<void> {
    await this.fetchUser();
  }
}
