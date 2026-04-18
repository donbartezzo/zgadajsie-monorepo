import { type Page, type Locator } from '@playwright/test';

export class EventsPage {
  readonly page: Page;
  readonly eventCards: Locator;
  readonly searchInput: Locator;

  constructor(page: Page, citySlug = 'warszawa') {
    this.page = page;
    this.eventCards = page.locator('[data-testid="event-card"], .event-card').first();
    this.searchInput = page.locator('[data-testid="search"], input[type="search"]').first();
  }

  async goto(citySlug = 'warszawa') {
    await this.page.goto(`/w/${citySlug}`);
  }

  async clickFirstEvent() {
    await this.eventCards.click();
  }
}
