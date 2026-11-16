// Запуск: node server.js  (нужен Node.js 18+, зависимости не требуются)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const TTL = 5 * 60 * 1000; // кэш на 5 минут, чтобы не злить Steam
const cache = {};

async function getDeals(cc) {
  const hit = cache[cc];
  if (hit && Date.now() - hit.t < TTL) return hit.data;

  const url = `https://store.steampowered.com/api/featuredcategories?cc=${cc}&l=russian`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 steam-live" } });
  if (!res.ok) throw new Error("Steam вернул " + res.status);
  const json = await res.json();

  const items = ((json.specials || {}).items || []).map((x) => ({
    id: x.id,
    name: x.name,
    disc: x.discount_percent,
    orig: (x.original_price || x.final_price) / 100,
    price: x.final_price / 100,
    cur: x.currency,
    img: x.header_image || x.large_capsule_image,
  }));

  const data = { cc, updated: Date.now(), items };
  cache[cc] = { t: Date.now(), data };
  return data;
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/api/deals") {
      const cc = (u.searchParams.get("cc") || "us").toLowerCase();
      if (!/^[a-z]{2}$/.test(cc)) {
        res.writeHead(400);
        return res.end("bad cc");
      }
      try {
        const data = await getDeals(cc);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
    if (u.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
    }
    res.writeHead(404);
    res.end("not found");
  })
  .listen(PORT, () => console.log("Открой http://localhost:" + PORT));
