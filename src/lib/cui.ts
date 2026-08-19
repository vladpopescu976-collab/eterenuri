/**
 * Codul de identificare fiscală românesc are o cifră de control, calculată
 * după un algoritm publicat. O verificăm fiindcă un CUI greșit se descoperă
 * altfel abia la prima factură, când e deja o problemă.
 */
const CHEIE = "753217532";

export function normalizeazaCui(valoare: string): string {
  return valoare.replace(/^ro/i, "").replace(/\D/g, "");
}

export function cuiValid(valoare: string): boolean {
  const cifre = normalizeazaCui(valoare);
  if (cifre.length < 2 || cifre.length > 10) return false;

  const control = Number(cifre[cifre.length - 1]);
  // Restul se aliniază la dreapta față de cheie, completat cu zerouri.
  const corp = cifre.slice(0, -1).padStart(CHEIE.length, "0");

  let suma = 0;
  for (let i = 0; i < CHEIE.length; i++) {
    suma += Number(corp[i]) * Number(CHEIE[i]);
  }

  // Rezultatul 10 se citește ca 0.
  return ((suma * 10) % 11) % 10 === control;
}
