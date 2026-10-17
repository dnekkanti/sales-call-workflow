import type { Debrief, Revenue } from "./schemas";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Excel model with live formulas, so a manager can change any assumption and see totals move. */
export async function downloadRevenueXlsx(rev: Revenue, seller: string, prospect: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Account model");
  ws.columns = [{ width: 34 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 60 }];

  ws.addRow([`${seller} × ${prospect}: account revenue model`]).font = { bold: true, size: 14 };
  ws.addRow(["Blue cells are inputs. Everything else is a formula."]).font = { italic: true, color: { argb: "FF666666" } };
  ws.addRow([]);

  const inputs: [string, number, string][] = [
    ["List price per seat / year (USD)", rev.price_per_seat_year, '"$"#,##0'],
    ["Discount %", rev.discount_pct / 100, "0%"],
    ["Annual price escalator %", rev.annual_price_escalator_pct / 100, "0.0%"],
  ];
  const inputStart = ws.rowCount + 1;
  for (const [label, value, fmt] of inputs) {
    const r = ws.addRow([label, value]);
    r.getCell(2).numFmt = fmt;
    r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBFF" } };
  }
  const [PRICE, DISC, ESC] = [0, 1, 2].map((i) => `$B$${inputStart + i}`);
  ws.addRow([]);

  const header = ws.addRow(["Seat group", "Headcount", "Adopt Y1", "Adopt Y2", "Adopt Y3", "Seats Y1", "Seats Y2", "Seats Y3", "Rationale"]);
  header.font = { bold: true };
  const first = ws.rowCount + 1;
  for (const g of rev.seat_groups) {
    const r = ws.addRow([g.group, g.headcount, g.adoption_pct_year1 / 100, null, g.adoption_pct_year3 / 100, null, null, null, g.rationale]);
    const n = r.number;
    r.getCell(4).value = { formula: `(C${n}+E${n})/2` };
    r.getCell(6).value = { formula: `ROUND(B${n}*C${n},0)` };
    r.getCell(7).value = { formula: `ROUND(B${n}*D${n},0)` };
    r.getCell(8).value = { formula: `ROUND(B${n}*E${n},0)` };
    [3, 4, 5].forEach((c) => (r.getCell(c).numFmt = "0%"));
    [2, 3, 5].forEach((c) => (r.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBFF" } }));
    r.getCell(9).alignment = { wrapText: true };
  }
  const last = ws.rowCount;
  const totals = ws.addRow(["Total seats", { formula: `SUM(B${first}:B${last})` }, null, null, null,
    { formula: `SUM(F${first}:F${last})` }, { formula: `SUM(G${first}:G${last})` }, { formula: `SUM(H${first}:H${last})` }]);
  totals.font = { bold: true };
  const T = totals.number;
  ws.addRow([]);

  const money = '"$"#,##0';
  const np = ws.addRow(["Net price per seat", null, null, null, null,
    { formula: `${PRICE}*(1-${DISC})` }, { formula: `${PRICE}*(1-${DISC})*(1+${ESC})` }, { formula: `${PRICE}*(1-${DISC})*(1+${ESC})^2` }]);
  const arr = ws.addRow(["ARR", null, null, null, null,
    { formula: `F${T}*F${np.number}` }, { formula: `G${T}*G${np.number}` }, { formula: `H${T}*H${np.number}` }]);
  arr.font = { bold: true };
  const tcv = ws.addRow(["3-year contract value", { formula: `SUM(F${arr.number}:H${arr.number})` }]);
  tcv.font = { bold: true };
  [np, arr].forEach((r) => [6, 7, 8].forEach((c) => (r.getCell(c).numFmt = money)));
  tcv.getCell(2).numFmt = money;

  ws.addRow([]);
  ws.addRow(["Expansion opportunities"]).font = { bold: true };
  for (const e of rev.expansion_opportunities) {
    const r = ws.addRow([e.name, e.estimated_annual_value, null, null, null, null, null, null, e.description]);
    r.getCell(2).numFmt = money;
  }
  ws.addRow([]);
  ws.addRow(["Key assumptions"]).font = { bold: true };
  ws.addRow([rev.price_rationale]);
  for (const n of rev.notes) ws.addRow([n]);

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slug(prospect)}-revenue-model.xlsx`);
}

/** Moves a date forward to Monday if it lands on a weekend. */
export function businessDate(start: string, dayOffset: number): Date {
  const d = new Date(`${start}T10:00:00`);
  d.setDate(d.getDate() + dayOffset);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;

// RFC 5545 says lines longer than 75 octets must be folded with CRLF + space. Count bytes, not
// characters, so multi-byte characters like em dashes don't push a line over the limit.
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

export function downloadFollowUpIcs(plan: Debrief["follow_up"], callDate: string, prospect: string) {
  const stamp = icsDate(new Date());
  const events = plan.map((item, i) => {
    const start = businessDate(callDate, item.day_offset);
    start.setHours(9 + (i % 3) * 2, 0, 0, 0);
    const end = new Date(start.getTime() + Math.max(15, item.duration_minutes) * 60_000);
    const prefix = item.channel === "email" ? "Send email: " : item.channel === "task" ? "Task: " : "";
    const description = [item.purpose, item.attendees.length ? `Attendees: ${item.attendees.join(", ")}` : "", item.email_subject ? `Subject: ${item.email_subject}` : "", item.email_body]
      .filter(Boolean)
      .join("\n\n");
    return [
      "BEGIN:VEVENT",
      `UID:${slug(prospect)}-${i}-${stamp}@deal-desk`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(`${prefix}${item.title}`)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      "END:VEVENT",
    ];
  });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Deal Desk//Follow-up plan//EN", "CALSCALE:GREGORIAN", ...events.flat(), "END:VCALENDAR"];
  download(new Blob([lines.map(fold).join("\r\n")], { type: "text/calendar" }), `${slug(prospect)}-follow-up-plan.ics`);
}

export function downloadJson(data: unknown, filename: string) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}
