// home.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../core/icons/icon.component';

@Component({
  selector: 'app-home',
  imports: [RouterModule, IconComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
