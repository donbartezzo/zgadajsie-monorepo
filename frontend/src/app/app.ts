import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FooterComponent } from './layout/footer/footer.component';
import { SnackbarComponent } from './shared/ui/snackbar/snackbar.component';

@Component({
  imports: [RouterModule, FooterComponent, SnackbarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = 'ZgadajSię';
}
