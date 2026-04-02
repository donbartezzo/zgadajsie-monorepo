import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, RouterTestingModule],
    }).compileComponents();
  });

  it('should render maintenance screen when maintenance is true', () => {
    const fixture = TestBed.createComponent(App);
    // Since environment.maintenance is true in tests, maintenance screen should render
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Trwają prace techniczne');
    expect(compiled.querySelector('strong')?.textContent).toContain('kontakt');
  });

  it('should render normal app when maintenance is false', () => {
    const fixture = TestBed.createComponent(App);
    // Override the component's maintenance property to false
    (fixture.componentInstance as App).maintenance = false;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app')).toBeTruthy();
    expect(compiled.querySelector('.app-container')).toBeTruthy();
    expect(compiled.querySelector('app-page-layout')).toBeTruthy();
  });

  it('should render app components when maintenance is false', () => {
    const fixture = TestBed.createComponent(App);
    // Override the component's maintenance property to false
    (fixture.componentInstance as App).maintenance = false;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-snackbar')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-overlays')).toBeTruthy();
    expect(compiled.querySelector('app-confirm-modal')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-nav')).toBeTruthy();
  });
});
