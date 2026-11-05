import { AsyncPipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { map } from 'rxjs';

@Component({
  selector: 'app-explorar-grupos',
  imports: [
    AsyncPipe,
    A11yModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './explorar-grupos.html',
  styleUrl: './explorar-grupos.css',
})
export class ExplorarGrupos {
  protected readonly vista$;
  protected readonly seleccion$;
  protected readonly filtros = new FormGroup({
    buscar: new FormControl('', { nonNullable: true }),
    principiante: new FormControl(false, { nonNullable: true }),
    intermedio: new FormControl(true, { nonNullable: true }),
    avanzado: new FormControl(false, { nonNullable: true }),
    publico: new FormControl(false, { nonNullable: true }),
    protegido: new FormControl(false, { nonNullable: true }),
    miembro: new FormControl(false, { nonNullable: true }),
    pendiente: new FormControl(false, { nonNullable: true }),
  });
  protected readonly codigo = new FormGroup({
    invitacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[A-Za-z0-9]{12}$/)],
    }),
  });
  protected readonly grupos = [
    {
      iniciales: 'EG',
      nombre: 'Entrenamiento de Grafos',
      nivel: 'Intermedio',
      publico: true,
      descripcion:
        'Preparación para competencias ICPC con enfoque en grafos y programación dinámica.',
      horario: 'Mar y jue de 19:00 a 21:00',
      cupo: 15,
      estado: 'Abierto',
      accion: 'Unirme',
      tono: 'from-[#7000ff] to-[#af6dff]',
    },
    {
      iniciales: 'AE',
      nombre: 'Algoritmos y Estructuras de Datos',
      nivel: 'Principiante',
      publico: false,
      descripcion:
        'Bases de algoritmos y estructuras de datos con prácticas semanales y sesiones de discusión.',
      horario: 'Lunes de 18:00 a 20:00',
      cupo: 20,
      estado: 'Abierto',
      accion: 'Solicitar ingreso',
      tono: 'from-[#00a9a4] to-[#54e4cd]',
    },
    {
      iniciales: 'TI',
      nombre: 'Training ICPC UPC',
      nivel: 'Avanzado',
      publico: false,
      descripcion:
        'Entrenamientos semanales, simulacros y revisión de problemas de competencias pasadas.',
      horario: 'Sábado de 09:00 a 12:00',
      cupo: 12,
      estado: 'Solicitud pendiente',
      accion: 'Ver estado',
      tono: 'from-[#2360e8] to-[#60a5fa]',
    },
    {
      iniciales: 'DH',
      nombre: 'Desarrollo de Habilidades Competitivas',
      nivel: 'Principiante',
      publico: true,
      descripcion:
        'Para practicantes que quieren mejorar su lógica y resolver problemas de forma constante.',
      horario: 'Miércoles de 17:00 a 19:00',
      cupo: 40,
      estado: 'Abierto',
      accion: 'Unirme',
      tono: 'from-[#a020dc] to-[#e7a5f9]',
    },
    {
      iniciales: 'GD',
      nombre: 'Grafos y DP Avanzado',
      nivel: 'Avanzado',
      publico: false,
      descripcion: 'Problemas avanzados de grafos, programación dinámica y técnicas combinatorias.',
      horario: 'Viernes de 19:00 a 21:00',
      cupo: 18,
      estado: 'Eres miembro',
      accion: 'Ver grupo',
      tono: 'from-[#bf125d] to-[#f44d91]',
    },
    {
      iniciales: 'IP',
      nombre: 'Introducción a la Programación Competitiva',
      nivel: 'Principiante',
      publico: true,
      descripcion:
        'Para quienes se inician: resolveremos problemas básicos y aprenderemos las bases.',
      horario: 'Lun y mié de 16:00 a 17:30',
      cupo: 40,
      estado: 'Abierto',
      accion: 'Unirme',
      tono: 'from-[#078b3e] to-[#54d884]',
    },
  ];
  constructor(route: ActivatedRoute) {
    this.seleccion$ = route.queryParamMap.pipe(
      map(
        (params) =>
          this.grupos.find((grupo) => grupo.iniciales === params.get('grupo')) ?? this.grupos[1],
      ),
    );
    this.vista$ = route.queryParamMap.pipe(
      map((params) => {
        const vista = params.get('vista') ?? '';
        return [
          'solicitar',
          'enviada',
          'ingreso',
          'codigo',
          'estado',
          'cargando',
          'sin-resultados',
          'duplicada',
          'sin-cupos',
          'cerradas',
        ].includes(vista)
          ? vista
          : '';
      }),
    );
  }
}
