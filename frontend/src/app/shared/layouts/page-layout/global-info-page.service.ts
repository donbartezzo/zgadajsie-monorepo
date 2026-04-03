import { Injectable, signal } from '@angular/core';
import { type IconName } from '../../ui/icon/icon.component';

export interface GlobalInfoPageData {
  title: string;
  description: string;
  icon?: IconName;
  buttonLabel?: string;
  buttonLink?: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalInfoPageService {
  readonly visible = signal(false);
  readonly data = signal<GlobalInfoPageData | null>(null);

  show(data: GlobalInfoPageData): void {
    this.data.set(data);
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
    this.data.set(null);
  }
}
