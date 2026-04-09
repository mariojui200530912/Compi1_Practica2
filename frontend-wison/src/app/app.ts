import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// @ts-ignore
import * as WisonParser from './logic/jison-parser';
import { AnalizadorLL } from './logic/analizador-ll'; // Asegúrate de la ruta
import { ErrorCompilacion, transformarParaVis } from './logic/models/models';
import { ArbolNodoComponent } from './components/arbol-nodo.component';
import { EditorWisonComponent } from './components/editor-wison.component.ts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ArbolNodoComponent, EditorWisonComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Variables de la interfaz
  codigoWison: string = '';
  cadenaEntrada: string = '';
  errores: ErrorCompilacion[] = [];
  listaAnalizadores: any[] = [];
  analizadorSeleccionado: any = null;
  datosArbol: any = null;
  analizadorTemporal: AnalizadorLL | null = null;
  nombreAnalizadorActual: string = '';
  erroresEntrada: any[] = [];

  constructor() {
    this.cargarDesdeStorage();
  }

  /**
   * Procesa el codigo Wison para crear un nuevo analizador
   */
  crearAnalizador() {
    this.errores = [];
    this.analizadorTemporal = null; // Limpiar el temporal anterior

    try {
      const yy = (WisonParser as any).parser?.yy || (WisonParser as any).yy;
      if (yy && yy.datosGramatica) {
        yy.datosGramatica.terminales = [];
        yy.datosGramatica.noTerminales = [];
        yy.datosGramatica.producciones = [];
        yy.datosGramatica.inicio = '';
      }
    } catch (e) {
      console.log('Nada que limpiar');
    }

    try {
      // Analisis del codigo Wison
      const datosGramatica = WisonParser.parse(this.codigoWison);

      // Instanciar el motor
      const nuevoMotor = new AnalizadorLL(datosGramatica);
      if (nuevoMotor.errorCompilacion.length === 0) {
        this.analizadorTemporal = nuevoMotor;
        alert('Gramática procesada y validada correctamente. Ya puede guardarla.');
      } else {
        this.errores = nuevoMotor.errorCompilacion;
      }

    } catch (e: any) {
      const esLexico = e.message.toLowerCase().includes('lexical');
      let columna = e.hash?.loc?.first_column;

      // Si es 0 o undefined, intentar extraerla del mensaje de texto mediante Regex
      if (columna === undefined || columna === 0) {
        // Jison suele lanzar: "Lexical error on line 13. Unrecognized text... at column 15"
        const matchCol = e.message.match(/column (\d+)/i);
        if (matchCol) {
          columna = parseInt(matchCol[1], 10);
        } else {
          // 3. Fallback: Calcular basándose en el "pointer" (---^) del mensaje de Jison
          const lineasMensaje = e.message.split('\n');
          const puntero = lineasMensaje.find((l: string) => l.includes('^'));
          if (puntero) {
            columna = puntero.indexOf('^');
          }
        }
      }

      this.errores.push({
        tipo: esLexico ? 'Léxico' : 'Sintáctico',
        mensaje: e.message,
        linea: e.hash?.line + 1 || parseInt(e.message.match(/line (\d+)/i)?.[1]) || 0,
        columna: columna || 0, // Ya no sumamos 1 aquí si el puntero ya nos da la posición real
      });
    }
  }

  /**
   * Evalua una cadena usando el analizador seleccionado
   */
  evaluarCadena() {
    this.erroresEntrada = [];
    this.datosArbol = null;

    if (!this.analizadorSeleccionado) {
      alert('Por favor, seleccione un analizador de la lista.');
      return;
    }

    const motor: AnalizadorLL = this.analizadorSeleccionado.motor;

    try {
      const tokens = motor.generarTokens(this.cadenaEntrada);
      const resultadoRaiz = motor.analizar(tokens);

      if (resultadoRaiz) {
        this.datosArbol = transformarParaVis(resultadoRaiz);
      }
    } catch (e: any) {
      this.erroresEntrada.push({
        tipo: e.message.includes('Léxico') ? 'Léxico' : 'Sintáctico',
        mensaje: e.message,
      });
    }
  }


  // Metodo para guardar el analizador actual en localStorage, con manejo de nombres y sobrescritura
  guardarAnalizadorPersistente() {
    if (!this.analizadorTemporal) {
      alert('Primero debe generar un analizador válido antes de guardar.');
      return;
    }

    const nombreSugerido = this.analizadorSeleccionado
      ? this.analizadorSeleccionado.nombre
      : `Analizador ${this.analizadorTemporal.simboloInicial}`;

    const nombrePersonalizado = prompt(
      'Ingrese el nombre del analizador (si ya existe, se sobrescribirá):',
      nombreSugerido,
    );

    if (nombrePersonalizado === null) return; // Si el usuario da a Cancelar

    const nombreFinal =
      nombrePersonalizado.trim() === ''
        ? `Sin Nombre (${new Date().toLocaleTimeString()})`
        : nombrePersonalizado.trim();

    const guardados = JSON.parse(localStorage.getItem('mis_analizadores') || '[]');

    const indiceExistente = guardados.findIndex(
      (a: any) => a.nombre.toLowerCase() === nombreFinal.toLowerCase(),
    );

    let idFinal;

    if (indiceExistente !== -1) {
      // CASO A: YA EXISTE -> SOBRESCRIBIR
      idFinal = guardados[indiceExistente].id; // Mantenemos su ID original

      // Actualizamos toda su información interna
      guardados[indiceExistente].configWison = this.codigoWison;
      guardados[indiceExistente].terminales = this.analizadorTemporal.terminales;
      guardados[indiceExistente].noTerminales = this.analizadorTemporal.noTerminales;
      guardados[indiceExistente].producciones = this.analizadorTemporal.producciones;
      guardados[indiceExistente].simboloInicial = this.analizadorTemporal.simboloInicial;
    } else {
      // CASO B: NO EXISTE -> CREAR NUEVO
      idFinal = Date.now();
      const nuevaData = {
        id: idFinal,
        nombre: nombreFinal,
        configWison: this.codigoWison,
        terminales: this.analizadorTemporal.terminales,
        noTerminales: this.analizadorTemporal.noTerminales,
        producciones: this.analizadorTemporal.producciones,
        simboloInicial: this.analizadorTemporal.simboloInicial,
      };
      guardados.push(nuevaData);
    }

    localStorage.setItem('mis_analizadores', JSON.stringify(guardados));

    this.cargarDesdeStorage();

    setTimeout(() => {
      this.analizadorSeleccionado = this.listaAnalizadores.find((a: any) => a.id === idFinal);
      this.analizadorTemporal = null;

      // Mostramos un mensaje diferente dependiendo de lo que pasó
      if (indiceExistente !== -1) {
        alert(`El analizador "${nombreFinal}" fue ACTUALIZADO correctamente.`);
      } else {
        alert(`El analizador "${nombreFinal}" fue CREADO correctamente.`);
      }
    }, 50);
  }

  /**
   * Funcion para eliminar un analizador de la persistencia
   */
  eliminarAnalizador(id: number) {
    if (confirm('¿Está seguro de que desea eliminar este analizador?')) {
      const guardados = JSON.parse(localStorage.getItem('mis_analizadores') || '[]');

      // Filtramos para quitar el que coincida con el ID
      const filtrados = guardados.filter((a: any) => a.id !== id);

      localStorage.setItem('mis_analizadores', JSON.stringify(filtrados));

      // Si el analizador eliminado era el seleccionado, lo limpiamos
      if (this.analizadorSeleccionado?.id === id) {
        this.analizadorSeleccionado = null;
        this.datosArbol = null;
      }

      this.cargarDesdeStorage();
    }
  }

  /**
   * Carga reconstruyendo los motores y manteniendo el ID
   */
  cargarDesdeStorage() {
    const guardados = JSON.parse(localStorage.getItem('mis_analizadores') || '[]');

    this.listaAnalizadores = guardados
      .map((data: any) => {
        try {
          const datosParaMotor = {
            terminales: data.terminales || [],
            noTerminales: data.noTerminales || [],
            producciones: data.producciones || [],
            inicio: data.simboloInicial || '' 
          };

          const motor = new AnalizadorLL(datosParaMotor);
          // Validamos para reconstruir la tabla LL(1) internamente
          if (motor.errorCompilacion.length === 0) {
            return {
              id: data.id,
              nombre: data.nombre,
              motor: motor,
              config: data.configWison,
            };
          } else {
            console.warn(`El analizador guardado '${data.nombre}' ya no es válido.`);
            return null;
          }
        } catch (e) {
          console.error(`Error al cargar el analizador ${data.nombre}`, e);
          return null;
        }
      })
      .filter((a: any) => a !== null);
  }

  cargarArchivo(event: any) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.codigoWison = e.target.result; // Coloca el contenido en el editor
    };
    reader.readAsText(archivo);
  }

  cargarCodigoEnEditor() {
    if (this.analizadorSeleccionado) {
      // Buscamos la configuración guardada que corresponde a este motor
      this.codigoWison = this.analizadorSeleccionado.config;
      // Limpiamos errores previos al cambiar de contexto
      this.errores = [];
      this.datosArbol = null;
    }
  }
}
