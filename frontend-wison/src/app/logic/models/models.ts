// Representa un Token o Terminal ($_Nombre)
export class Terminal {
    constructor(
        public nombre: string,   
        public regex: string,    
        public fila: number,
        public columna: number
    ) {}
}

// Representa un No Terminal (%_Nombre)
export class NoTerminal {
    constructor(
        public nombre: string,    
        public fila: number,
        public columna: number
    ) {}
}

// Representa una Produccion (Estructura: %_S <= %_Prod_A $_FIN)
export class Produccion {
    constructor(
        public izquierda: string,        
        public derecha: Array<string>,   
        public fila: number,
        public columna: number
    ) {}
}

// Nodo para el Arbol de Derivacion
export class NodoArbol {
    public hijos: NodoArbol[] = [];
    constructor(
        public valor: string,            
        public esTerminal: boolean       
    ) {}

    public agregarHijo(hijo: NodoArbol) {
        this.hijos.push(hijo);
    }
}

export function transformarParaVis(raiz: NodoArbol | null): { nodes: any[], edges: any[] } {
  if (!raiz) {
    return { nodes: [], edges: [] };
  }

  const nodes: any[] = [];
  const edges: any[] = [];
  
  let idCounter = 1;

  function recorrer(nodo: NodoArbol, idPadre: number | null) {
    if (!nodo) return;

    const idActual = idCounter++;

    // Azul claro para No Terminales, Gris claro para Terminales, y Verde para Épsilon
    let colorFondo = '#bbdefb'; // Por defecto No Terminal
    let colorBorde = '#0d6efd';

    if (nodo.esTerminal) {
      if (nodo.valor === 'ε' || nodo.valor === 'EPSILON') {
        colorFondo = '#d1e7dd'; // Verde suave para Épsilon
        colorBorde = '#198754';
      } else {
        colorFondo = '#e2e8f0'; // Gris para Terminales normales
        colorBorde = '#6c757d';
      }
    }

    nodes.push({
      id: idActual,
      label: nodo.valor,
      color: {
        background: colorFondo,
        border: colorBorde
      }
    });

    if (idPadre !== null) {
      edges.push({
        from: idPadre,
        to: idActual
      });
    }

    if (nodo.hijos && nodo.hijos.length > 0) {
      for (const hijo of nodo.hijos) {
        recorrer(hijo, idActual);
      }
    }
  }

  recorrer(raiz, null);

  return { nodes, edges };
}

export interface ErrorCompilacion {
    tipo: string;
    mensaje: string;
    linea: number;
    columna: number;
}