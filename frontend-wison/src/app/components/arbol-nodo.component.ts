import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-arbol-nodo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arbol-nodo.component.html',
  styles: [
    `
      .ms-4 {
        margin-left: 1.5rem;
      }
      .border-start {
        border-left: 2px dashed #dee2e6 !important;
      }
    `,
  ],
})
export class ArbolNodoComponent {
  @Input() nodo: any;

  esTerminal(valor: string): boolean {
    if (!valor) return false;
    // Limpiamos espacios por si acaso
    const v = valor.trim();
    return v.startsWith('$_') || v === 'ε';
  }
}
