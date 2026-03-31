import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, RouterTestingModule],
    }).compileComponents();
  });

  it('should render the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app')).toBeTruthy();
    expect(compiled.querySelector('.app-container')).toBeTruthy();
    expect(compiled.querySelector('app-page-layout')).toBeTruthy();
  });

  it('should render app components', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-snackbar')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-overlays')).toBeTruthy();
    expect(compiled.querySelector('app-confirm-modal')).toBeTruthy();
    expect(compiled.querySelector('app-bottom-nav')).toBeTruthy();
  });
});
