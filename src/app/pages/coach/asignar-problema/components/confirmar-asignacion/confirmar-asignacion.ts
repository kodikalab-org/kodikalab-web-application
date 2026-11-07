import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-confirmar-asignacion',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  templateUrl: './confirmar-asignacion.html',
  styleUrl: './confirmar-asignacion.css',
  host: { class: 'block' },
})
export class ConfirmarAsignacion {
  protected readonly pasos = [
    { numero: 1, titulo: 'Seleccionar problemas', detalle: 'Elige del catálogo', hecho: true, actual: false, clase: 'border-kl-border bg-white/3', claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white' },
    { numero: 2, titulo: 'Configurar asignación', detalle: 'Competencia, letras y puntaje', hecho: true, actual: false, clase: 'border-kl-border bg-white/3', claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white' },
    { numero: 3, titulo: 'Revisar y confirmar', detalle: 'Verifica antes de asignar', hecho: false, actual: true, clase: 'border-[#8a6cff] bg-[#241a5c]/60', claseNumero: 'bg-linear-to-b from-[#8a6cff] to-[#6e52f2] text-white' },
  ];

  // Datos de ejemplo del Figma.
  protected readonly problemas = [
    { titulo: 'Theatre Square', detalle: 'CF-1A · Codeforces', letra: 'C', puntaje: '100', color: '#FF0000' },
    { titulo: 'Weird Algorithm', detalle: 'CSES-1068 · CSES', letra: 'D', puntaje: '100', color: '#22C55E' },
    { titulo: 'Shortest Routes I', detalle: 'CSES-1671 · CSES', letra: 'E', puntaje: '100', color: '#3B82F6' },
    { titulo: 'I Hate Non-integer Number', detalle: 'ABC262-D · AtCoder', letra: 'F', puntaje: '100', color: '#FACC15' },
  ];
}
