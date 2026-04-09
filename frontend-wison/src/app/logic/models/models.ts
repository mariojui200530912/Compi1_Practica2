// 1. Representa un Token o Terminal ($_Nombre)
export class Terminal {
    constructor(
        public nombre: string,   
        public regex: string,    
        public fila: number,
        public columna: number
    ) {}
}

// 2. Representa un No Terminal (%_Nombre)
export class NoTerminal {
    constructor(
        public nombre: string,    
        public fila: number,
        public columna: number
    ) {}
}

// 3. Representa una Producción (Estructura: %_S <= %_Prod_A $_FIN)
export class Produccion {
    constructor(
        public izquierda: string,        
        public derecha: Array<string>,   
        public fila: number,
        public columna: number
    ) {}
}

// 4. Nodo para el Árbol de Derivación (Requisito Visual)
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

export interface ErrorCompilacion {
    tipo: string;
    mensaje: string;
    linea: number;
    columna: number;
}