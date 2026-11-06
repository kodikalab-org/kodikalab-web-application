import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Sidebar {
  readonly opened = signal(false);
}
