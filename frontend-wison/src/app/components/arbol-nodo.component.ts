import { Component, Input, OnChanges, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importamos la librería de Vis.js
import { Network } from 'vis-network';

@Component({
  selector: 'app-arbol-nodo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arbol-nodo.component.html'
})
export class ArbolNodoComponent implements OnChanges {
  @Input() nodo: any; 
  
  @ViewChild('grafoContainer', { static: true }) contenedor!: ElementRef;

  private networkInstance: any = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['nodo'] && this.nodo && this.nodo.nodes) {
      this.dibujarGrafo();
    }
  }

  dibujarGrafo() {
    const data = {
      nodes: this.nodo.nodes,
      edges: this.nodo.edges
    };

    const options = {
      layout: {
        hierarchical: {
          direction: 'UD', // Up to Down (De arriba hacia abajo)
          sortMethod: 'directed',
          levelSeparation: 80,
          nodeSpacing: 100
        }
      },
      nodes: {
        shape: 'box', // Bolitas o cajas cuadradas
        font: { size: 16, face: 'monospace' },
        color: {
          background: '#e3f2fd',
          border: '#0d6efd',
          highlight: { background: '#bbdefb', border: '#0b5ed7' }
        }
      },
      edges: {
        arrows: 'to', // Flechas apuntando al hijo
        color: '#6c757d',
        smooth: { enabled: true, type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.4 }
      },
      physics: false 
    };

    if (this.networkInstance) {
      this.networkInstance.destroy();
    }

    this.networkInstance = new Network(this.contenedor.nativeElement, data, options);
  }
}