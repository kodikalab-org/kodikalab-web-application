import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-grupos-marco',
  imports: [RouterLink, RouterOutlet, MatButtonModule, MatMenuModule, MatToolbarModule],
  templateUrl: './grupos-marco.html',
  styleUrl: './grupos-marco.css',
})
export class GruposMarco {
  protected readonly coach: boolean;
  constructor(route: ActivatedRoute) {
    this.coach = route.snapshot.data['coach'] === true;
  }
}
