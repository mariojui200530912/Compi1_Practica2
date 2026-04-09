import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editor-wison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-wison.component.ts.html',
  styles: [`
    .editor-container {
      display: flex;
      height: 100%;
      border: 1px solid #ced4da;
      border-radius: 4px;
      overflow: hidden;
      background: #212529; /* Fondo oscuro tipo VS Code */
    }
    .line-numbers {
      width: 40px;
      padding: 10px 0;
      background: #1a1d20;
      color: #6c757d;
      text-align: right;
      padding-right: 8px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      line-height: 21px; /* Debe coincidir exactamente con el textarea */
      user-select: none;
      overflow: hidden;
    }
    .line-numbers span { display: block; }
    textarea {
      flex: 1;
      border: none;
      background: transparent;
      color: #74ccf4; /* Color cyan para el código */
      padding: 10px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      line-height: 21px;
      resize: none;
      outline: none;
      white-space: pre;
      overflow: auto;
    }
  `]
})
export class EditorWisonComponent {
  @Input() content: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Output() contentChange = new EventEmitter<string>();

  lines: number[] = [1];

  onContentChange(value: string) {
    this.content = value;
    this.lines = value.split('\n').map((_, i) => i + 1);
    this.contentChange.emit(this.content);
  }

  syncScroll(event: any, lineNumbers: HTMLElement) {
    lineNumbers.scrollTop = event.target.scrollTop;
  }
}