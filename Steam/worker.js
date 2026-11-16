import html from "./index.html";

const CUR = { ru: "RUB", ua: "UAH", kz: "KZT", us: "USD", de: "EUR", gb: "GBP", pl: "PLN", tr: "TRY" };

const dec = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&trade;|&reg;/g, "");

function parse(page) {
  const chunks = page.split("search_result_row").slice(1);
  const out = [];
  for (const b of chunks) {
    const id = (b.match(/data-ds-appid="(\d+)"/) || [])[1];
    const title = (b.match(/<span class="title">([^<]*)</) || [])[1];
    const fin = (b.match(/data-price-final="(\d+)"/) || [])[1];
    const disc = +((b.match(/data-discount="-?(\d+)"/)  [])[1]  0);
    if (!id  !title  !fin  !disc  disc >= 100) continue;
    const tip = (b.match(/data-tooltip-html="([^"]*)"/)  [])[1]  "";
    const m = tip.match(/(\d+)%[^\d]*([\d\s,.\u00a0\u202f]+)/);
    const p = +fin / 100;
    out.push({
      i: +id,
      n: dec(title),
      d: disc,
      p,
      o: +(p / (1 - disc / 100)).toFixed(2),
      r: m ? +m[1] : 0,
      v: m ? +m[2].replace(/\D/g, "") : 0,
    });
  }
  return { out, raw: chunks.length };
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });

export default {
  async fetch(req) {
    const u = new URL(req.url);

    if (u.pathname === "/") {
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (u.pathname === "/api/deals") {
      const cc = (u.searchParams.get("cc") || "us").toLowerCase();
      const start = Math.max(0, parseInt(u.searchParams.get("start")  "0", 10)  0);
      if (!CUR[cc]) return json({ error: "bad cc" }, 400);

      const base =
        "https://store.steampowered.com/search/results/?query&start=" + start +
        "&count=50&dynamic_data=&sort_by=_ASC&snr=1_7_7_2300_7&specials=1&category1=998&infinite=1&cc=" + cc;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://store.steampowered.com/search/?specials=1",
      };
      let last = "";
      for (const lang of ["russian", "english"]) {
        try {
          const res = await fetch(base + "&l=" + lang, { headers });
          const txt = await res.text();
          if (!txt.trim()) { last = "Steam вернул пустой ответ (HTTP " + res.status + ")"; continue; }
          let j;
          try { j = JSON.parse(txt); } catch (e) { last = "Steam вернул не JSON (HTTP " + res.status + "): " + txt.slice(0, 120); continue; }
          const { out, raw } = parse(j.results_html || "");
          return json({ cc, cur: CUR[cc], start, next: raw ? start + raw : 0, total: j.total_count || 0, items: out });
        } catch (e) {
          last = String(e.message || e);
        }
      }
      return json({ error: last }, 502);
    }

    return new Response("not found", { status: 404 });
  },
};