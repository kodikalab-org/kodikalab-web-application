import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatToolbarModule,
    MatMenuModule,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  host: {
    '(window:scroll)': 'updateActiveSection()',
    '(window:resize)': 'updateActiveSection()',
  },
})
export class LandingPage {
  @ViewChild('header', { read: ElementRef })
  private header?: ElementRef<HTMLElement>;

  @ViewChildren('inicio,caracteristicas,comunidad,precios', { read: ElementRef })
  private sections?: QueryList<ElementRef<HTMLElement>>;

  protected activeSection = 'inicio';

  constructor(private readonly changeDetector: ChangeDetectorRef) {
    // Browser-only: also handles an initial fragment or restored scroll position.
    afterNextRender(() => this.updateActiveSection());
  }

  protected updateActiveSection(): void {
    // Include the breathing room used by anchor scrolling below the mobile toolbar.
    const activationLine = (this.header?.nativeElement.getBoundingClientRect().bottom ?? 0) + 32;
    let activeSection = 'inicio';

    for (const section of this.sections ?? []) {
      const bounds = section.nativeElement.getBoundingClientRect();
      if (bounds.height > 0 && bounds.top <= activationLine) {
        activeSection = section.nativeElement.id;
      }
    }

    if (activeSection !== this.activeSection) {
      this.activeSection = activeSection;
      this.changeDetector.markForCheck();
    }
  }

  protected readonly navLinks = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Características', fragment: 'caracteristicas' },
    { label: 'Comunidad', fragment: 'comunidad' },
    { label: 'Recursos', fragment: undefined },
    { label: 'Precios', fragment: 'precios' },
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

  protected readonly platforms = [
    { name: 'Codeforces', icon: 'images/landing/platform-codeforces.svg' },
    { name: 'AtCoder', icon: 'images/landing/platform-atcoder.svg' },
    { name: 'LeetCode', icon: 'images/landing/platform-leetcode.svg' },
    { name: 'vJudge', icon: 'images/landing/platform-vjudge.svg' },
  ];

  protected readonly socials = [
    { label: 'Discord', icon: 'images/landing/social-1.svg' },
    { label: 'GitHub', icon: 'images/landing/social-github.svg' },
    { label: 'Instagram', icon: 'images/landing/social-3.svg' },
  ];

  protected readonly plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Da tus primeros pasos y encuentra tu ritmo de entrenamiento.',
      price: '0',
      period: 'sin costo',
      featured: false,
      action: 'Comenzar gratis',
      features: [
        'Acceso al catálogo de problemas',
        'Participación en equipos de entrenamiento',
        'Consultas limitadas al agente de Kodikalab',
        'Resumen básico de tu progreso',
      ],
    },
    {
      id: 'go',
      name: 'GO',
      description: 'Más acompañamiento para entrenar con intención y llegar más lejos.',
      price: '20',
      period: 'al mes',
      featured: true,
      action: 'Me interesa GO',
      features: [
        'Todo lo incluido en Free',
        'Mayor acceso al agente de Kodikalab',
        'Recomendaciones personalizadas de entrenamiento',
        'Análisis de rendimiento más detallados',
        'Identificación de fortalezas y temas por mejorar',
        'Seguimiento avanzado de tu evolución',
      ],
    },
  ];

  protected scrollToSection(fragment: string | undefined, ...sections: HTMLElement[]): void {
    sections.find((section) => section.id === fragment)?.scrollIntoView({ block: 'start' });
  }
}
