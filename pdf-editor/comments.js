// PDF comments: threads written as standard Text annotations (replies point to the first one with /IRT,
// a resolved thread gets a hidden /State Completed reply), and read back the same way. Acrobat, Edge,
// Chrome and macOS Preview show these as normal comments.

export const pdfDate = (ms) => {
  const d = new Date(ms || Date.now()), z = (n) => String(n).padStart(2, "0");
  return `D:${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`;
};
export const parsePdfDate = (s) => {
  const m = /D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(s || "");
  return m ? Date.UTC(+m[1], (+m[2] || 1) - 1, +m[3] || 1, +m[4] || 0, +m[5] || 0, +m[6] || 0) : Date.now();
};
const hexToRgb01 = (h) => [1, 3, 5].map((i) => +(parseInt(String(h || "#f59e0b").slice(i, i + 2), 16) / 255).toFixed(3));

/**
 * Adds one thread to pdf-lib page `p`. comment: { id, thread: [{ author, text, at }], resolved, resolvedBy,
 * resolvedAt, color }. rect: [x1, y1, x2, y2] in PDF user space. Returns the number of annotations added.
 */
export function writeCommentAnnots(out, p, comment, rect) {
  const { PDFString, PDFHexString } = window.PDFLib;
  const thread = (comment.thread || []).filter((m) => m.text?.trim());
  if (!thread.length) return 0;
  const ctx = out.context, C = hexToRgb01(comment.color);
  const base = (m) => ({ Type: "Annot", Subtype: "Text", Rect: rect, Contents: PDFHexString.fromText(m.text), T: PDFHexString.fromText(m.author || "Guest"),
    M: PDFString.of(pdfDate(m.at)), CreationDate: PDFString.of(pdfDate(m.at)), Name: "Comment", C, F: 4 });
  const parent = ctx.register(ctx.obj({ ...base(thread[0]), NM: PDFString.of("ad-" + comment.id), Open: false }));
  p.node.addAnnot(parent);
  thread.slice(1).forEach((m, i) => p.node.addAnnot(ctx.register(ctx.obj({ ...base(m), NM: PDFString.of(`ad-${comment.id}-${i + 1}`), IRT: parent, RT: "R" }))));
  if (comment.resolved) {
    p.node.addAnnot(ctx.register(ctx.obj({ ...base({ text: "Resolved", author: comment.resolvedBy || thread[0].author, at: comment.resolvedAt }),
      NM: PDFString.of(`ad-${comment.id}-state`), IRT: parent, State: PDFString.of("Completed"), StateModel: PDFString.of("Review"), F: 30 })));
  }
  return thread.length + (comment.resolved ? 1 : 0);
}

/** Reads the comment threads of a pdf-lib page: [{ rect, color, resolved, thread: [{ author, text, at }] }]. */
export function readCommentAnnots(libPage) {
  const { PDFName, PDFDict } = window.PDFLib;
  const annots = libPage.node.Annots();
  if (!annots) return [];
  const list = [];
  for (let i = 0; i < annots.size(); i++) {
    const d = annots.lookup(i);
    if (d instanceof PDFDict && d.get(PDFName.of("Subtype")) === PDFName.of("Text")) list.push({ ref: annots.get(i), d });
  }
  const str = (d, key) => { const v = d.lookup(PDFName.of(key)); return v?.decodeText ? v.decodeText() : ""; };
  const irt = (d) => d.get(PDFName.of("IRT"));
  const msg = (d) => ({ author: str(d, "T") || "Unknown", text: str(d, "Contents"), at: parsePdfDate(str(d, "M") || str(d, "CreationDate")) });
  return list.filter((x) => !irt(x.d)).map((a) => {
    const kids = list.filter((x) => irt(x.d) === a.ref);
    const r = a.d.lookup(PDFName.of("Rect")), n = (j) => r?.lookup(j)?.asNumber?.() ?? 0;
    const c = a.d.lookup(PDFName.of("C"));
    const color = c?.size?.() === 3 ? "#" + [0, 1, 2].map((j) => Math.round(c.lookup(j).asNumber() * 255).toString(16).padStart(2, "0")).join("") : "#f59e0b";
    return {
      rect: [Math.min(n(0), n(2)), Math.min(n(1), n(3)), Math.max(n(0), n(2)), Math.max(n(1), n(3))], color,
      resolved: kids.some((x) => str(x.d, "StateModel") === "Review" && str(x.d, "State") === "Completed"),
      thread: [msg(a.d), ...kids.filter((x) => !str(x.d, "State")).map((x) => msg(x.d))],
    };
  });
}
