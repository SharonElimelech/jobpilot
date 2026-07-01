// minimal markdown → html for kit rendering (headings, bold, lists, paragraphs)
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function mdToHtml(md: string): string {
  const lines = esc(md).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const line of lines) {
    const bolded = line.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (/^###\s/.test(bolded)) { closeList(); out.push(`<h4>${bolded.slice(4)}</h4>`); }
    else if (/^##\s/.test(bolded)) { closeList(); out.push(`<h3>${bolded.slice(3)}</h3>`); }
    else if (/^#\s/.test(bolded)) { closeList(); out.push(`<h3>${bolded.slice(2)}</h3>`); }
    else if (/^\s*[-*]\s/.test(bolded)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${bolded.replace(/^\s*[-*]\s/, "")}</li>`);
    } else if (bolded.trim() === "") { closeList(); }
    else { closeList(); out.push(`<p>${bolded}</p>`); }
  }
  closeList();
  return out.join("\n");
}
