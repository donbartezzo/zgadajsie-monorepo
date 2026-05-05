import { Injectable, signal } from '@angular/core';

export interface ExplainerContent {
  title: string;
  description: string;
  anchor: DOMRect;
}

@Injectable({ providedIn: 'root' })
export class ExplainerService {
  readonly state = signal<ExplainerContent | null>(null);

  open(content: ExplainerContent): void {
    this.state.set(content);
  }

  close(): void {
    this.state.set(null);
  }

  toggle(content: ExplainerContent): void {
    const current = this.state();
    if (current?.title === content.title && current?.description === content.description) {
      this.close();
    } else {
      this.open(content);
    }
  }
}
