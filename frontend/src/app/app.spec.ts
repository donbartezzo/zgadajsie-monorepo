import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from './app';
import { environment } from '../environments/environment';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, RouterTestingModule],
    }).compileComponents();
  });

  it('should render maintenance screen when maintenance is true', () => {
    const fixture = TestBed.createComponent(App);
    // Override the readonly maintenance property
    Object.defineProperty(fixture.componentInstance, 'maintenance', {
      value: true,
      writable: false,
      configurable: true,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Trwają prace techniczne');
    expect(compiled.querySelector('strong')?.textContent).toContain('kontakt');
  });

  it('should render normal app when maintenance is false', () => {
    const fixture = TestBed.createComponent(App);
    // Override the readonly maintenance property
    Object.defineProperty(fixture.componentInstance, 'maintenance', {
      value: false,
      writable: false,
      configurable: true,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app')).toBeTruthy();
    expect(compiled.querySelector('.app-container')).toBeTruthy();
    expect(compiled.querySelector('app-page-layout')).toBeTruthy();
  });

  it('should render app components when maintenance is false', () => {
    const fixture = TestBed.createComponent(App);
    // Override the readonly maintenance property
    Object.defineProperty(fixture.componentInstance, 'maintenance', {
      value: false,
      writable: false,
      configurable: true,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-snackbar')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-overlays')).toBeTruthy();
    expect(compiled.querySelector('app-confirm-modal')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-nav')).toBeTruthy();
  });

  describe('maintenance getter', () => {
    const ORIGINAL_MAINTENANCE = environment.maintenance;

    afterEach(() => {
      environment.maintenance = ORIGINAL_MAINTENANCE;
      localStorage.removeItem('maintenanceBypass');
    });

    it('is disabled when password is empty', () => {
      environment.maintenance = '';
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance.maintenance).toBe(false);
    });

    it('is enabled when password is set and no bypass stored', () => {
      environment.maintenance = 'secret-password';
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance.maintenance).toBe(true);
    });

    it('is bypassed when localStorage value matches the password', () => {
      environment.maintenance = 'secret-password';
      localStorage.setItem('maintenanceBypass', 'secret-password');
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance.maintenance).toBe(false);
    });

    it('stays enabled when localStorage value does not match the password', () => {
      environment.maintenance = 'secret-password';
      localStorage.setItem('maintenanceBypass', 'wrong-password');
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance.maintenance).toBe(true);
    });
  });
});
