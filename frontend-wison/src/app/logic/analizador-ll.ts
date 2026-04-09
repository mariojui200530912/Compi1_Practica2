import { ErrorCompilacion, NodoArbol, NoTerminal, Produccion, Terminal } from './models/models';

export class AnalizadorLL {
  public terminales: Terminal[] = [];
  public noTerminales: NoTerminal[] = [];
  public producciones: Produccion[] = [];
  public simboloInicial: string = '';
  public errorCompilacion: ErrorCompilacion[] = [];
  private tokens: string[] = []; // La entrada ya tokenizada (ej: ["$_Una_A", "$_Mas", "$_Una_A"])
  private indiceActual: number = 0;
  private tablaParsing: Map<string, Map<string, Produccion>> = new Map();

  constructor() {}

  // Aquí implementarás la validación LL(1)
  public validarGramatica(): boolean {
    this.errorCompilacion = []; // Limpiar errores anteriores
    try {
      // 1. Verificar recursividad por la izquierda directa [cite: 15]
      for (const p of this.producciones) {
        if (p.izquierda === p.derecha[0]) {
          throw new Error(`Recursividad izquierda detectada en: ${p.izquierda}`);
        }
      }

      // 2. Intentar generar la tabla (detecta colisiones/ambigüedad) [cite: 14, 17]
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

  // Función para obtener el conjunto FIRST de un símbolo
  public obtenerFirst(simbolo: string): Set<string> {
    let firsts: Set<string> = new Set();

    if (simbolo === 'EPSILON') {
      firsts.add('EPSILON');
      return firsts;
    }

    if (this.esTerminal(simbolo)) {
      firsts.add(simbolo);
      return firsts;
    }

    const produccionesDeS = this.producciones.filter((p) => p.izquierda === simbolo);

    for (const p of produccionesDeS) {
      for (let i = 0; i < p.derecha.length; i++) {
        const currentFirsts = this.obtenerFirst(p.derecha[i]);

        // Agregamos todo lo que no sea EPSILON
        currentFirsts.forEach((f) => {
          if (f !== 'EPSILON') firsts.add(f);
        });

        // Si el símbolo actual NO produce EPSILON, nos detenemos
        if (!currentFirsts.has('EPSILON')) break;

        // Si llegamos al final y todos producen EPSILON, el No Terminal produce EPSILON
        if (i === p.derecha.length - 1) firsts.add('EPSILON');
      }
    }
    return firsts;
  }

  public obtenerFollow(noTerminal: string): Set<string> {
    let follows: Set<string> = new Set();

    // 1. Si es el símbolo inicial, agregamos el fin de cadena ($ o $_FIN)
    if (noTerminal === this.simboloInicial) {
      follows.add('$_FIN');
    }

    // 2. Buscamos todas las producciones donde 'noTerminal' esté en la parte DERECHA
    for (const p of this.producciones) {
      const index = p.derecha.indexOf(noTerminal);

      if (index !== -1) {
        // Si hay algo después del símbolo: A -> α B β
        if (index < p.derecha.length - 1) {
          const siguiente = p.derecha[index + 1];
          const firstSiguiente = this.obtenerFirst(siguiente);
          firstSiguiente.forEach((f) => follows.add(f));
        }
        // Si no hay nada después: A -> α B, el FOLLOW(B) contiene FOLLOW(A)
        else if (p.izquierda !== noTerminal) {
          const followIzquierda = this.obtenerFollow(p.izquierda);
          followIzquierda.forEach((f) => follows.add(f));
        }
      }
    }
    return follows;
  }

  public analizar(entradaTokenizada: string[]): NodoArbol | null {
    this.tokens = [...entradaTokenizada, '$_FIN']; // Agregamos fin de cadena [cite: 34]
    this.indiceActual = 0;

    try {
      // Iniciamos la recursión con el símbolo inicial [cite: 12, 44]
      const raiz = this.parseSimbolo(this.simboloInicial);

      // Si después de la recursión no consumimos todo, hay error
      if (this.tokens[this.indiceActual] !== '$_FIN') {
        throw new Error('Error: No se consumió toda la entrada');
      }

      return raiz;
    } catch (error) {
      console.error(error);
      return null; // Retorna null si la cadena no es aceptada [cite: 26]
    }
  }

  /**
   * Función recursiva principal que decide qué camino tomar
   */
  private parseSimbolo(simbolo: string): NodoArbol {
    const nodo = new NodoArbol(simbolo, this.esTerminal(simbolo));
    const tokenActual = this.tokens[this.indiceActual];

    // CASO 1: El símbolo es un TERMINAL
    if (this.esTerminal(simbolo)) {
      if (simbolo === tokenActual) {
        this.indiceActual++; // Consumimos el token
        return nodo;
      } else {
        throw new Error(`Error Sintáctico: Se esperaba ${simbolo} pero se encontró ${tokenActual}`);
      }
    }

    // CASO 2: El símbolo es un NO TERMINAL
    // Buscamos en la tabla LL(1) qué producción usar [cite: 10, 12]
    const produccionesParaNoTerminal = this.tablaParsing.get(simbolo);
    const produccionAEjecutar = produccionesParaNoTerminal?.get(tokenActual);

    if (!produccionAEjecutar) {
      throw new Error(`Error Sintáctico: No hay regla para (${simbolo}, ${tokenActual})`);
    }

    // Aplicamos la producción: expandimos sus hijos recursivamente [cite: 11]
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
    return s.startsWith('$_');
  }

  public generarTablaParsing(): void {
    this.tablaParsing.clear();
    this.errorCompilacion = [];

    for (const p of this.producciones) {
      const firstsDerecha = this.obtenerFirstDeCadena(p.derecha);

      // Regla 1: Para cada t en FIRST(derecha), si t != EPSILON
      firstsDerecha.forEach((t) => {
        if (t !== 'EPSILON') this.agregarATabla(p.izquierda, t, p);
      });

      // Regla 2: Si EPSILON está en FIRST(derecha),
      // agregar la producción para cada t en FOLLOW(izquierda)
      if (firstsDerecha.has('EPSILON')) {
        const follows = this.obtenerFollow(p.izquierda);
        follows.forEach((t) => {
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

    // VALIDACIÓN DE COLISIONES
    if (fila.has(terminal)) {
      const pExistente = fila.get(terminal)!;

      // Construimos una representación visual de las reglas
      const reglaNueva = `${produccion.izquierda} -> ${produccion.derecha.join(' ')}`;
      const reglaVieja = `${pExistente.izquierda} -> ${pExistente.derecha.join(' ')}`;

      const mensaje =
        `Colisión LL(1) en [${noTerminal}, ${terminal}].\n` +
        `Regla A: (${reglaNueva}) en línea ${produccion.fila}\n` +
        `Regla B: (${reglaVieja}) en línea ${pExistente.fila}\n` +
        `Sugerencia: Revisa si hay ambigüedad o necesitas factorizar por la izquierda.`;

      const error: any = new Error(mensaje);
      error.linea = produccion.fila;
      error.columna = produccion.columna;
      throw error;
    }

    fila.set(terminal, produccion);
  }

  public generarTokens(textoEntrada: string): string[] {
    let tokensEncontrados: string[] = [];
    let lineas = textoEntrada.split('\n');

    const terminalesOrdenados = [...this.terminales].sort(
      (a, b) => b.regex.length - a.regex.length,
    );

    for (let i = 0; i < lineas.length; i++) {
      let lineaActual = lineas[i];
      let columnaLocal = 1;

      while (lineaActual.length > 0) {
        // Ignorar espacios, tabs, etc.
        const espacioMatch = lineaActual.match(/^[\s\t]+/);
        if (espacioMatch) {
          columnaLocal += espacioMatch[0].length;
          lineaActual = lineaActual.substring(espacioMatch[0].length);
          continue;
        }

        let coincidencia = false;

        for (const term of terminalesOrdenados) {
          // Limpiar el patrón para obtener una regex válida
          let rawPattern = term.regex;

          // Si el patrón está envuelto en comillas simples, extraemos el contenido interno
          if (rawPattern.startsWith("'") && rawPattern.endsWith("'")) {
            rawPattern = rawPattern.slice(1, -1);
            // Escapamos caracteres especiales SOLO para literales (para que '+' coincida con el carácter '+')
            rawPattern = rawPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }

          try {
            const regex = new RegExp('^(' + rawPattern + ')');
            const match = lineaActual.match(regex);
            if (match) {
              tokensEncontrados.push(term.nombre);
              lineaActual = lineaActual.substring(match[0].length);
              columnaLocal += match[0].length;
              coincidencia = true;
              break;
            }
          } catch (e) {
            console.warn(`Regex inválida para terminal ${term.nombre}: ${rawPattern}`, e);
          }
        }

        if (!coincidencia) {
          throw new Error(
            `Error Léxico en Línea ${i + 1}, Columna ${columnaLocal}: Carácter "${lineaActual[0]}" (código ${lineaActual.charCodeAt(0)}) no reconocido.`,
          );
        }
      }
    }
    return tokensEncontrados;
  }

  private obtenerFirstDeCadena(cadena: string[]): Set<string> {
    let res = new Set<string>();
    for (const s of cadena) {
      const f = this.obtenerFirst(s);
      f.forEach((x) => {
        if (x !== 'EPSILON') res.add(x);
      });
      if (!f.has('EPSILON')) return res;
    }
    res.add('EPSILON');
    return res;
  }
}
