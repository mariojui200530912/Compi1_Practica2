import { ErrorCompilacion, NodoArbol, NoTerminal, Produccion, Terminal } from './models/models';

export class AnalizadorLL {
  public terminales: Terminal[] = [];
  public noTerminales: NoTerminal[] = [];
  public producciones: Produccion[] = [];
  public simboloInicial: string = '';
  public errorCompilacion: ErrorCompilacion[] = [];
  private tokens: {nombre: string, valor: string}[] = [];
  private indiceActual: number = 0;
  private tablaParsing: Map<string, Map<string, Produccion>> = new Map();

  constructor(datosGramatica?: any) {
    if (datosGramatica) {
      this.terminales = datosGramatica.terminales || [];
      this.noTerminales = datosGramatica.noTerminales || [];
      this.producciones = datosGramatica.producciones || [];
      this.simboloInicial = datosGramatica.inicio || '';

      // Inmediatamente validamos la semantica y generamos la tabla
      this.validarGramatica();
    }
  }

  public validarGramatica(): boolean {
    this.errorCompilacion = []; // Limpiar errores anteriores
    try {
      this.validarSemantica();
      // Verificar recursividad por la izquierda directa
      for (const p of this.producciones) {
        if (p.izquierda === p.derecha[0]) {
          throw new Error(
            `Error Semántico: Recursividad por la izquierda detectada en: ${p.izquierda} -> ${p.derecha.join(' ')}`,
          );
        }
      }

      // Generar la tabla (detecta colisiones/ambigüedad)
      this.generarTablaParsing();

      return true;
    } catch (error: any) {
      this.errorCompilacion.push({
        tipo: 'Semántico',
        mensaje: error.message,
        linea: error.linea || 0,
        columna: error.columna || 0,
      });
      console.error('Gramática no válida para LL(1):', error.message);
      return false;
    }
  }

  private validarSemantica() {
    const nombresNoTerminales = this.noTerminales.map((nt) => nt.nombre);
    const nombresTerminales = this.terminales.map((t) => t.nombre);

    if (!nombresNoTerminales.includes(this.simboloInicial)) {
      throw new Error(`El Initial_Sim '${this.simboloInicial}' no fue declarado como No_Terminal.`);
    }

    this.noTerminales.forEach((nt) => {
      const tieneRegla = this.producciones.some((p) => p.izquierda === nt.nombre);
      if (!tieneRegla) {
        throw new Error(
          `El No_Terminal '${nt.nombre}' fue declarado, pero no tiene ninguna producción asignada.`,
        );
      }
    });

    this.producciones.forEach((prod) => {
      prod.derecha.forEach((simbolo) => {
        if (simbolo !== 'EPSILON') {
          const existeTerminal = nombresTerminales.includes(simbolo);
          const existeNoTerminal = nombresNoTerminales.includes(simbolo);
          if (!existeTerminal && !existeNoTerminal) {
            const err: any = new Error(
              `El símbolo '${simbolo}' usado en la producción de '${prod.izquierda}' NO ha sido declarado previamente.`,
            );
            err.linea = prod.fila;
            err.columna = prod.columna;
            throw err;
          }
        }
      });
    });
  }

  // Funcion para obtener el conjunto FIRST de un simbolo
  public obtenerFirst(simbolo: string, visitados: Set<string> = new Set()): Set<string> {
    let firsts: Set<string> = new Set();

    if (simbolo === 'EPSILON') {
      firsts.add('EPSILON');
      return firsts;
    }

    if (this.esTerminal(simbolo)) {
      firsts.add(simbolo);
      return firsts;
    }

    // Evita bucles como A -> B, B -> A
    if (visitados.has(simbolo)) return firsts; 
    visitados.add(simbolo);

    const produccionesDeS = this.producciones.filter(p => p.izquierda === simbolo);

    for (const p of produccionesDeS) {
      for (let i = 0; i < p.derecha.length; i++) {
        // Pasamos el set de visitados para evitar ciclos
        const currentFirsts = this.obtenerFirst(p.derecha[i], new Set(visitados));

        currentFirsts.forEach((f) => {
          if (f !== 'EPSILON') firsts.add(f);
        });

        if (!currentFirsts.has('EPSILON')) break;
        if (i === p.derecha.length - 1) firsts.add('EPSILON');
      }
    }
    return firsts;
  }

  public obtenerFollow(noTerminal: string, visitados: Set<string> = new Set()): Set<string> {
    let follows: Set<string> = new Set();

    if (noTerminal === this.simboloInicial) {
      follows.add('EOF');
    }

    if (visitados.has(noTerminal)) return follows;
    visitados.add(noTerminal);

    for (const p of this.producciones) {
      // Buscar TODAS las ocurrencias del noTerminal en la parte derecha
      const indices = [];
      for(let i=0; i<p.derecha.length; i++) {
          if (p.derecha[i] === noTerminal) indices.push(i);
      }

      for (const index of indices) {
        if (index < p.derecha.length - 1) {
          // Extraemos el subarreglo que sigue al noTerminal
          const cadenaSiguiente = p.derecha.slice(index + 1);
          const firstSiguiente = this.obtenerFirstDeCadena(cadenaSiguiente);
          
          firstSiguiente.forEach(f => {
            if (f !== 'EPSILON') follows.add(f);
          });

          // Si el FIRST de todo lo que sigue tiene EPSILON, agregamos el FOLLOW de la izquierda
          if (firstSiguiente.has('EPSILON') && p.izquierda !== noTerminal) {
            const followIzquierda = this.obtenerFollow(p.izquierda, visitados);
            followIzquierda.forEach(f => follows.add(f));
          }
        } 
        else if (p.izquierda !== noTerminal) {
          const followIzquierda = this.obtenerFollow(p.izquierda, visitados);
          followIzquierda.forEach(f => follows.add(f));
        }
      }
    }
    return follows;
  }

  public analizar(entradaTokenizada: {nombre: string, valor: string}[]): NodoArbol | null {
    this.tokens = [...entradaTokenizada, { nombre: 'EOF', valor: 'EOF' }];
    this.indiceActual = 0;

    try {
      const raiz = this.parseSimbolo(this.simboloInicial);

      if (this.tokens[this.indiceActual].nombre !== 'EOF') {
        throw new Error(`Error Sintáctico: Análisis finalizado prematuramente. Token no consumido: ${this.tokens[this.indiceActual]}`);
      }

      return raiz;
    } catch (error: any) {
      throw error; // Lanza el error para que app.ts lo atrape en evaluarCadena
    }
  }

  /**
   * Funcion recursiva principal que decide que camino tomar
   */
  private parseSimbolo(simbolo: string): NodoArbol {
    const nodo = new NodoArbol(simbolo, this.esTerminal(simbolo));
    const tokenActual = this.tokens[this.indiceActual];

    if (this.esTerminal(simbolo)) {
      if (simbolo === tokenActual.nombre) {
        if (simbolo !== 'EOF' && simbolo !== 'EPSILON') {
          nodo.valor = `${simbolo}\n"${tokenActual.valor}"`; 
        }
        this.indiceActual++; 
        return nodo;
      } else {
        throw new Error(`Error Sintáctico: Se esperaba '${simbolo}' pero se encontró '${tokenActual}'.`);
      }
    }

    const produccionesParaNoTerminal = this.tablaParsing.get(simbolo);
    const produccionAEjecutar = produccionesParaNoTerminal?.get(tokenActual.nombre);

    if (!produccionAEjecutar) {
      throw new Error(`Error Sintáctico en token '${tokenActual}': No hay regla LL(1) para el símbolo (${simbolo}).`);
    }

    for (const simboloHijo of produccionAEjecutar.derecha) {
      if (simboloHijo === 'EPSILON') {
        nodo.agregarHijo(new NodoArbol('ε', true));
      } else {
        const hijo = this.parseSimbolo(simboloHijo);
        nodo.agregarHijo(hijo);
      }
    }

    return nodo;
  }

  private esTerminal(s: string): boolean {
    return s.startsWith('$_') || s === 'EOF';
  }

  public generarTablaParsing(): void {
    this.tablaParsing.clear();

    for (const p of this.producciones) {
      const firstsDerecha = this.obtenerFirstDeCadena(p.derecha);

      firstsDerecha.forEach(t => {
        if (t !== 'EPSILON') this.agregarATabla(p.izquierda, t, p);
      });

      if (firstsDerecha.has('EPSILON')) {
        const follows = this.obtenerFollow(p.izquierda);
        follows.forEach(t => {
          this.agregarATabla(p.izquierda, t, p);
        });
      }
    }
  }

  private agregarATabla(noTerminal: string, terminal: string, produccion: Produccion): void {
    if (!this.tablaParsing.has(noTerminal)) {
      this.tablaParsing.set(noTerminal, new Map());
    }

    const fila = this.tablaParsing.get(noTerminal)!;

    if (fila.has(terminal)) {
      const pExistente = fila.get(terminal)!;
      const reglaNueva = `${produccion.izquierda} -> ${produccion.derecha.join(' ')}`;
      const reglaVieja = `${pExistente.izquierda} -> ${pExistente.derecha.join(' ')}`;

      const error: any = new Error(
        `Ambigüedad LL(1) detectada en casilla [${noTerminal}, ${terminal}].\n` +
        `- Regla A: ${reglaNueva}\n` +
        `- Regla B: ${reglaVieja}`
      );
      error.linea = produccion.fila;
      error.columna = produccion.columna;
      throw error;
    }

    fila.set(terminal, produccion);
  }

  public generarTokens(textoEntrada: string): {nombre: string, valor: string}[] {
    let tokensEncontrados: {nombre: string, valor: string}[] = [];
    let lineas = textoEntrada.split('\n');

    const terminalesOrdenados = [...this.terminales].sort((a, b) => b.regex.length - a.regex.length);

    for (let i = 0; i < lineas.length; i++) {
      let lineaActual = lineas[i];
      let columnaLocal = 1;

      while (lineaActual.length > 0) {
        const espacioMatch = lineaActual.match(/^[\s\t]+/);
        if (espacioMatch) {
          columnaLocal += espacioMatch[0].length;
          lineaActual = lineaActual.substring(espacioMatch[0].length);
          continue;
        }

        let coincidencia = false;

        for (const term of terminalesOrdenados) {
          let rawPattern = term.regex;

          if (rawPattern.startsWith("'") && rawPattern.endsWith("'")) {
            rawPattern = rawPattern.slice(1, -1);
            rawPattern = rawPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }

          try {
            const regex = new RegExp('^(' + rawPattern + ')');
            const match = lineaActual.match(regex);
            if (match) {
              tokensEncontrados.push({ nombre: term.nombre, valor: match[0] });
              lineaActual = lineaActual.substring(match[0].length);
              columnaLocal += match[0].length;
              coincidencia = true;
              break;
            }
          } catch (e) {
            console.warn(`Regex inválida para terminal ${term.nombre}`);
          }
        }

        if (!coincidencia) {
          throw new Error(`Error Léxico en Línea ${i + 1}, Col. ${columnaLocal}: Carácter "${lineaActual[0]}" no reconocido.`);
        }
      }
    }
    return tokensEncontrados;
  }

  private obtenerFirstDeCadena(cadena: string[]): Set<string> {
    let res = new Set<string>();
    for (const s of cadena) {
      const f = this.obtenerFirst(s);
      f.forEach(x => {
        if (x !== 'EPSILON') res.add(x);
      });
      if (!f.has('EPSILON')) return res;
    }
    res.add('EPSILON');
    return res;
  }
}
