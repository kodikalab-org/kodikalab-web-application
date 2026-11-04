import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatToolbarModule,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class LandingPage {
  protected readonly navLinks = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Características', fragment: 'caracteristicas' },
    { label: 'Comunidad', fragment: 'comunidad' },
    { label: 'Recursos', fragment: undefined },
    { label: 'Precios', fragment: undefined },
  ];

  protected readonly stats = [
    { value: '+500', label: 'Problemas en el catálogo' },
    { value: '+150', label: 'Estudiantes y egresados' },
    { value: '10+', label: 'Equipos de entrenamiento' },
    { value: '4', label: 'Plataformas integradas' },
  ];

  protected readonly features = [
    {
      icon: 'images/landing/feature-catalog.svg',
      gradient: 'linear-gradient(135deg, #8a3fd6 0%, #b05cf0 100%)',
      title: 'Catálogo de problemas',
      description: 'Explora problemas por tema, dificultad y plataforma.',
    },
    {
      icon: 'images/landing/feature-teams.svg',
      gradient: 'linear-gradient(135deg, #3a4fd8 0%, #5c7bf0 100%)',
      title: 'Equipos de entrenamiento',
      description: 'Forma o únete a grupos con horarios, niveles y objetivos.',
    },
    {
      icon: 'images/landing/feature-analytics.svg',
      gradient: 'linear-gradient(135deg, #238a5c 0%, #3fb77f 100%)',
      title: 'Análisis de rendimiento',
      description: 'Visualiza tu progreso, detecta debilidades y mejora.',
    },
    {
      icon: 'images/landing/feature-assistant.svg',
      gradient: 'linear-gradient(135deg, #b32e63 0%, #e0507f 100%)',
      title: 'Asistente inteligente',
      description: 'Busca problemas en lenguaje natural, recibe recomendaciones y más.',
    },
  ];

  protected readonly avatars = [
    { letter: 'A', gradient: 'linear-gradient(135deg, #7b4dff 0%, #b987ff 100%)' },
    { letter: 'B', gradient: 'linear-gradient(135deg, #3a4fd8 0%, #6f8cff 100%)' },
    { letter: 'C', gradient: 'linear-gradient(135deg, #238a5c 0%, #53c892 100%)' },
    { letter: 'D', gradient: 'linear-gradient(135deg, #b32e63 0%, #f06c9b 100%)' },
  ];

  // Testimonios de ejemplo: el diseño muestra dos indicadores en el carrusel.
  protected readonly testimonials = [
    'Kodikalab nos permite entrenar en equipo, seguir nuestro progreso y prepararnos mejor para las competencias.',
    'Tener los problemas, los equipos y el progreso en un solo lugar nos ayuda a enfocarnos en lo que hay que mejorar.',
  ];

  protected readonly platforms = [
    { name: 'Codeforces', icon: 'images/landing/platform-codeforces.svg' },
    { name: 'AtCoder', icon: 'images/landing/platform-atcoder.svg' },
    { name: 'LeetCode', icon: 'images/landing/platform-leetcode.svg' },
    { name: 'vJudge', icon: 'images/landing/platform-vjudge.svg' },
  ];

  protected readonly socials = [
    { label: 'Red social 1', icon: 'images/landing/social-1.svg' },
    { label: 'GitHub', icon: 'images/landing/social-github.svg' },
    { label: 'Red social 3', icon: 'images/landing/social-3.svg' },
  ];

  protected menuOpen = false;
  protected activeLink = 'Inicio';
  protected currentTestimonial = 0;

  protected toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  protected closeMenu(): void {
    this.menuOpen = false;
  }

  protected selectLink(label: string): void {
    this.activeLink = label;
    this.closeMenu();
  }

  protected previousTestimonial(): void {
    const total = this.testimonials.length;
    this.currentTestimonial = (this.currentTestimonial - 1 + total) % total;
  }

  protected nextTestimonial(): void {
    this.currentTestimonial = (this.currentTestimonial + 1) % this.testimonials.length;
  }

  protected goToTestimonial(index: number): void {
    this.currentTestimonial = index;
  }
}
