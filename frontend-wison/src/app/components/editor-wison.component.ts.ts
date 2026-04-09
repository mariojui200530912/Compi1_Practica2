import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editor-wison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-wison.component.ts.html', // Verifica que esta ruta sea la correcta en tu proyecto
  styleUrl: './editor-wison.component.ts.scss' 
})
export class EditorWisonComponent implements OnChanges {
  @Input() content: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Output() contentChange = new EventEmitter<string>();

  lines: number[] = [1];

  // 2. ESTO ES CLAVE: Detecta cuando el texto cambia desde el componente padre (ej. al cargar un archivo)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.actualizarLineas(this.content);
    }
  }

  onContentChange(value: string) {
    this.content = value;
    this.actualizarLineas(value);
    this.contentChange.emit(this.content);
  }

  // Función auxiliar para no repetir código
  private actualizarLineas(texto: string) {
    const numLineas = (texto || '').split('\n').length;
    // Si numLineas es 0 (vacío), aseguramos que siempre haya al menos 1 línea
    this.lines = Array.from({ length: Math.max(1, numLineas) }, (_, i) => i + 1);
  }

  syncScroll(event: any, lineNumbers: HTMLElement) {
    lineNumbers.scrollTop = event.target.scrollTop;
  }
}