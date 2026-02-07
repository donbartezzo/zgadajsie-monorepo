import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { SnackbarComponent } from './shared/ui/snackbar/snackbar.component';

@Component({
  imports: [RouterModule, HeaderComponent, FooterComponent, SnackbarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = 'ZgadajSię';
}
