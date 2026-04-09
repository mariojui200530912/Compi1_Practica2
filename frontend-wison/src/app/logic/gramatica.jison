/* Código inicial */
%{
    const { Terminal, NoTerminal, Produccion } = require('./models/models');
    
    let datosGramatica; 
%}

%lex
%options case-sensitive
%%

\s+                         /* Ignorar saltos, tabs y espacios [REQUISITO] */ 
"#".*                       /* Comentario de línea simple */ 
"/**"[\s\S]*?"*/"           /* Comentario de bloque multilínea  */ 

/* Palabras Reservadas */
"Wison"                     return 'RW_WISON';
"Lex"                       return 'RW_LEX';
"Syntax"                    return 'RW_SYNTAX';
"Terminal"                  return 'RW_TERMINAL';
"No_Terminal"               return 'RW_NOTERMINAL';
"Initial_Sim"               return 'RW_INITIAL';
"?Wison"                    return 'OP_PREG_CE_WISON';

/* Símbolos y Operadores */
"¿"                         return 'OP_PREG_AB';
"{{:"                       return 'DEL_SYN_AB';
":}}"                       return 'DEL_SYN_CE';
"{:"                        return 'DEL_LEX_AB';
":}"                        return 'DEL_LEX_CE';
"<-"                        return 'ASIG_LEX';
"<="                        return 'ASIG_SYN';
";"                         return 'PT_COMA';
"|"                         return 'PIPE';

/* Identificadores */
"$_"[a-zA-Z0-9_]+           return 'ID_TERMINAL';   /* REQUISITO: Inician con $_ */
"%_"[a-zA-Z0-9_]+           return 'ID_NOTERMINAL'; /* REQUISITO: Inician con %_ */

/* Expresiones Regulares */
"'"[^']*"'"                 return 'LITERAL';       /* REQUISITO: Comillas simples */
"[aA-zZ]"|"[0-9]"           return 'RANGE';         /* REQUISITO: Solo estos dos rangos */
"*"                         return 'STAR';
"+"                         return 'PLUS';
"?"                         return 'QUESTION';
"("                         return 'PAR_AB';
")"                         return 'PAR_CE';

<<EOF>>                     return 'EOF';

/lex

%left 'LITERAL' 'RANGE' 'PAR_AB'
%left 'CONCAT'
%left 'STAR' 'PLUS' 'QUESTION'

%start inicio

%%

inicio
    : inicializar_datos RW_WISON OP_PREG_AB RW_LEX DEL_LEX_AB bloque_lex DEL_LEX_CE bloque_syntax OP_PREG_CE_WISON EOF
        { return datosGramatica; }
    ;

inicializar_datos
    : /* vacío */
        {
            datosGramatica = {
                terminales: [],
                noTerminales: [],
                producciones: [],
                inicio: ""
            };
        }
    ;

bloque_lex
    : bloque_lex declaracion_terminal
    | declaracion_terminal
    ;

declaracion_terminal
    : RW_TERMINAL ID_TERMINAL ASIG_LEX expresion_reg PT_COMA
        {
            datosGramatica.terminales.push(new Terminal($2, $4, this._$.first_line, this._$.first_column));
        }
    ;

expresion_reg
    : LITERAL                     { $$ = $1; }
    | RANGE                       { $$ = $1; }
    | expresion_reg STAR          { $$ = $1 + "*"; }
    | expresion_reg PLUS          { $$ = $1 + "+"; }
    | expresion_reg QUESTION      { $$ = $1 + "?"; }
    | PAR_AB expresion_reg PAR_CE { $$ = "(" + $2 + ")"; }
    | expresion_reg expresion_reg %prec CONCAT { $$ = $1 + $2; }
    ;

bloque_syntax
    : RW_SYNTAX DEL_SYN_AB lista_instrucciones_syntax DEL_SYN_CE
    ;

lista_instrucciones_syntax
    : lista_instrucciones_syntax instruccion_syntax
    | instruccion_syntax
    ;

instruccion_syntax
    : RW_NOTERMINAL ID_NOTERMINAL PT_COMA
        { datosGramatica.noTerminales.push(new NoTerminal($2, this._$.first_line, this._$.first_column)); }
    | RW_INITIAL ID_NOTERMINAL PT_COMA
        { datosGramatica.inicio = $2; }
    | ID_NOTERMINAL ASIG_SYN opciones_produccion PT_COMA
        { 
            $3.forEach(opcion => {
                datosGramatica.producciones.push(new Produccion($1, opcion, this._$.first_line, this._$.first_column));
            }); 
        }
    ;

opciones_produccion
    : opciones_produccion PIPE opcion
        { $1.push($3); $$ = $1; }
    | opcion
        { $$ = [$1]; }
    ;

opcion
    : lista_simbolos 
        { $$ = $1; }
    | /* vacío */    
        { $$ = ["EPSILON"]; }
    ;

lista_simbolos
    : lista_simbolos simbolo_individual      
        { $1.push($2); $$ = $1; }
    | simbolo_individual                     
        { $$ = [$1]; }
    ;

simbolo_individual
    : ID_TERMINAL    { $$ = $1; }
    | ID_NOTERMINAL  { $$ = $1; }
    ;            
