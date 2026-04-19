import { type Page, type Locator } from '@playwright/test';

export class EventDetailPage {
  readonly page: Page;
  readonly joinButton: Locator;
  readonly leaveButton: Locator;
  readonly participantGrid: Locator;
  readonly eventTitle: Locator;
  readonly enrollmentCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.joinButton = page
      .locator('[data-testid="join-button"], button:has-text("Dołącz")')
      .first();
    this.leaveButton = page
      .locator('[data-testid="leave-button"], button:has-text("Wycofaj")')
      .first();
    this.participantGrid = page
      .locator('[data-testid="participant-grid"], app-enrollment-grid')
      .first();
    this.eventTitle = page.locator('[data-testid="event-title"], h1').first();
    this.enrollmentCount = page.locator('[data-testid="enrollment-count"]').first();
  }

  async goto(citySlug: string, eventId: string) {
    await this.page.goto(`/w/${citySlug}/${eventId}`);
  }

  async join() {
    await this.joinButton.click();
  }

  async leave() {
    await this.leaveButton.click();
  }
}
