import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ViewportComponent } from './viewport/viewport.component';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet, ViewportComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'rowguide';
}
