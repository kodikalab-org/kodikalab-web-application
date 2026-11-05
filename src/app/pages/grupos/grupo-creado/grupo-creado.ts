import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-grupo-creado',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './grupo-creado.html',
  styleUrl: './grupo-creado.css',
})
export class GrupoCreado {}
