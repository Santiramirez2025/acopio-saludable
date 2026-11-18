// Nombres de pila comunes en Argentina (y sus diminutivos de uso diario), sin tildes y en minúscula.
//
// 17/11 (Santiago): «el nombre de perfil muchas veces es un alias»: «Gustavobrasentino», «Guada bienestar»,
// «Paton Santucho», «🐉🧚», «Al Meyui Bazar». Saludar por el perfil queda raro. Solo se usa el nombre del perfil
// si su primera palabra es un nombre de pila que reconocemos; si no, se saluda sin nombre hasta que el cliente
// diga cómo se llama (o lo ponga en el pedido).

const LISTA = `
abel abigail abril ada adela adelina adolfo adrian adriana agostina agustin agustina aida aida aixa alan alba alberto alcira aldana alejandra alejandro alejo alfonso alfredo alicia alma alvaro amalia amanda amelia america ana anabel anabella anahi analia andrea andres angel angela angeles angelica angelina anibal anita antonela antonella antonia antonio araceli ariana ariel armando arturo augusto aurelio aurora axel azul
barbara bautista beatriz belen benjamin benito bernardo betty bety bianca blanca brenda brian bruno
camila candela candelaria carina carla carlos carmela carmen carola carolina catalina cecilia celeste celia cesar cintia cinthia clara claudia claudio clotilde concepcion constanza cristian cristina cynthia
daiana daniela daniel dante dario david debora delfina delia diana diego dolores dora dorotea
eduardo elba elena eliana elias elisa elizabeth ella elsa elvira emanuel emilce emilia emiliano emilio emma enrique erica erika ernesto esteban estela estefania ester esther eugenia eugenio eva evangelina ezequiel
fabian fabiana fabio facundo federico felipe fernanda fernando fiorella flavia florencia franco francisco gabriel gabriela gaston gerardo german gisela giselle gladys gloria graciela gregorio griselda guadalupe guillermo gustavo
hector helena hernan hilda horacio hugo ignacio ileana ines irene iris isabel ismael ivan ivana jaime javier jesica jessica jimena joaquin jonatan jorge jose josefa josefina juan juana julia julian juliana julieta julio karen karina
laura leandro leila leonardo leonel leticia lidia liliana lisandro lorena lourdes lucas lucia luciana luciano lucila lucrecia luis luisa lujan luz magali magdalena malena manuel manuela marcela marcelo marcos margarita maria mariana mariano maricel marina mario marisa marisol marta martha martin martina mateo matias maura mauricio maximiliano melina melisa mercedes micaela miguel milagros milena miriam mirta monica myriam
nadia nahuel natalia nelida nelson nestor nicolas noelia nora norma octavio olga oliva omar oscar pablo paola patricia paula paulina pedro pilar priscila rafael ramiro ramon raquel raul rebeca renata ricardo roberto rocio rodolfo rodrigo rogelio romina rosa rosana rosario rosalia roxana ruben ruth
sabrina salvador samanta samuel sandra santiago santino sara sebastian selva sergio silvana silvia silvina sofia soledad sonia stella susana tamara teresa teresita tomas valentin valentina valeria vanesa vanina veronica vicente victor victoria vilma virginia viviana walter ximena yamila yanina yesica yolanda zulema
azu agus ale alejo anto beti cami caro cata chiche claudi coco cris dani eli eme fede fer feli flor gabi guada gus iña jime juli juancho lau lore lu lucho luchi majo male maru mati meli mica mili moni naty nati negra neli nico noe pao pato pau pepe quique rami ro rocio sabri santi sole tati tere tito tomi vale vane vero vicky viki yoli
`;

const NOMBRES = new Set(LISTA.split(/\s+/).filter(Boolean));

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** ¿Es un nombre de pila que reconocemos? («María», «Quique», «Guada»). */
export function esNombreDePila(palabra: string): boolean {
  return NOMBRES.has(sinTildes(palabra));
}
