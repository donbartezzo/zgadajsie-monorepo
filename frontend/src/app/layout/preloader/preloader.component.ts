import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-preloader',
  standalone: true,
  templateUrl: './preloader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreloaderComponent {}
