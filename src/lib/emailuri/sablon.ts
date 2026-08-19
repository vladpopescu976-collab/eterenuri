import { urlAplicatie } from "@/lib/email";

export type Rand = { eticheta: string; valoare: string };

/**
 * Un singur schelet pentru toate mesajele, ca ele să arate a aceeași aplicație.
 *
 * Stilurile sunt scrise pe fiecare element: clienții de email ignoră în mare
 * parte `<style>` și aproape complet CSS-ul modern.
 */
export function sablon(continut: {
  titlu: string;
  salut?: string;
  paragrafe: string[];
  randuri?: Rand[];
  actiune?: { text: string; link: string };
  incheiere?: string;
}): { html: string; text: string } {
  const { titlu, salut, paragrafe, randuri = [], actiune, incheiere } = continut;
  const baza = urlAplicatie();

  const htmlRanduri = randuri.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin:0 0 24px">
        ${randuri
          .map(
            (rand, index) => `<tr>
            <td style="padding:11px 14px;font-size:13px;color:#6b7280;${index ? "border-top:1px solid #e5e7eb" : ""}">${escapa(rand.eticheta)}</td>
            <td style="padding:11px 14px;font-size:14px;font-weight:600;text-align:right;${index ? "border-top:1px solid #e5e7eb" : ""}">${escapa(rand.valoare)}</td>
          </tr>`
          )
          .join("")}
      </table>`
    : "";

  const htmlActiune = actiune
    ? `<p style="margin:0 0 24px">
        <a href="${actiune.link}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">${escapa(actiune.text)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">Dacă butonul nu funcționează, copiază linkul acesta în browser:</p>
      <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${actiune.link}" style="color:#16a34a">${escapa(actiune.link)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="ro">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#16a34a;font-weight:600">Scorer</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapa(titlu)}</h1>
        ${salut ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">Bună, ${escapa(salut)}!</p>` : ""}
        ${paragrafe.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${escapa(p)}</p>`).join("")}
        ${htmlRanduri}
        ${htmlActiune}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px" />
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6">
          ${incheiere ? `${escapa(incheiere)}<br /><br />` : ""}Ai primit acest mesaj pentru că ai un cont pe <a href="${baza}" style="color:#16a34a">Scorer</a>.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    titlu,
    "",
    salut ? `Bună, ${salut}!` : "",
    ...paragrafe,
    "",
    ...randuri.map((r) => `${r.eticheta}: ${r.valoare}`),
    actiune ? `\n${actiune.text}: ${actiune.link}` : "",
    incheiere ? `\n${incheiere}` : "",
  ]
    .filter((linie) => linie !== "")
    .join("\n");

  return { html, text };
}

// Numele clienților ajung direct în mesaj; fără asta, un nume cu „<” ar strica
// aranjarea sau ar putea introduce markup nedorit.
function escapa(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
