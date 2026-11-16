const CUR = { ru: "RUB", ua: "UAH", kz: "KZT", us: "USD", de: "EUR", gb: "GBP", pl: "PLN", tr: "TRY" };

const dec = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
   .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&trade;|&reg;/g, "");

function parse(page) {
  const chunks = page.split('<a href="https://store.steampowered.com/app/').slice(1);
  const out = [];
  
  for (const chunk of chunks) {
    const b = chunk.slice(0, 5000);

    const id = (b.match(/^(\d+)/) || [])[1];
    const title = (b.match(/<span class="title">([^<]*)<\/span>/) || [])[1];
    const fin = (b.match(/data-price-final="(\d+)"/) || [])[1];
    const disc = +((b.match(/data-discount="-?(\d+)"/) || [])[1] || 0);
    
    if (!id || !title || !fin || !disc || disc >= 100) continue;
    
    // --- ЖЕЛЕЗОБЕТОННЫЙ ПАРСИНГ ТЕГОВ (ЖАНРОВ) ---
    const tags = [];
    const tagBlockMatch = b.match(/<div class="col search_tags[^>]*>([\s\S]*?)<\/div>/);
    if (tagBlockMatch) {
        // Ищем все теги <a>...</a> внутри этого блока
        const tagLinks = tagBlockMatch[1].matchAll(/<a[^>]*>([^<]*)<\/a>/g);
        for (const match of tagLinks) {
            let cleanTag = dec(match[1].trim());
            if (cleanTag) tags.push(cleanTag);
        }
    }

    // --- ЯЗЫКИ ---
    const hasRussian = b.toLowerCase().includes('russian') || b.includes('Русский');

    // --- ВРЕМЯ СКИДКИ ---
    let discountEnd = 0;
    const endMatch = b.match(/data-discount-end="(\d+)"/);
    if (endMatch) discountEnd = +endMatch[1];

    const tip = (b.match(/data-tooltip-html="([^"]*)"/) || [])[1] || "";
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
      t: tags,
      lang_ru: hasRussian,
      end: discountEnd
    });
  }
  return { out, raw: chunks.length };
}
// ... остальной код (json, onRequestGet, onRequestPost) оставляешь как было ...
