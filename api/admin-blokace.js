const { neon } = require('@neondatabase/serverless');
const { slotyProDen } = require('./_hodiny');

function overitHeslo(req) {
  const hlavicka = req.headers.authorization || '';
  if (!hlavicka.startsWith('Basic ')) return false;
  const [uzivatel, heslo] = Buffer.from(hlavicka.slice(6), 'base64').toString().split(':');
  return uzivatel === (process.env.ADMIN_USER || 'admin') && heslo === process.env.ADMIN_PASSWORD;
}

module.exports = async (req, res) => {
  if (!overitHeslo(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
    res.status(401).json({ ok: false, error: 'Neautorizováno.' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metoda není povolena.' });
    return;
  }

  const { datum, mod, cas } = req.body || {};
  if (!datum || !mod) {
    res.status(400).json({ ok: false, error: 'Chybí datum nebo režim blokace.' });
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (mod === 'den') {
      const sloty = slotyProDen(datum);
      if (sloty.length === 0) {
        res.status(400).json({ ok: false, error: 'Tento den je mimo otevírací dobu.' });
        return;
      }
      for (const t of sloty) {
        await sql`
          INSERT INTO bookings (typ, datum, cas)
          VALUES ('blokace', ${datum}, ${t})
          ON CONFLICT (datum, cas) DO NOTHING
        `;
      }
      res.status(200).json({ ok: true, zablokovano: sloty.length });
      return;
    }

    if (mod === 'slot') {
      if (!cas) {
        res.status(400).json({ ok: false, error: 'Chybí čas.' });
        return;
      }
      const existuje = await sql`SELECT id FROM bookings WHERE datum = ${datum} AND cas = ${cas}`;
      if (existuje.length > 0) {
        res.status(409).json({ ok: false, error: 'Tento termín je již obsazený nebo zablokovaný.' });
        return;
      }
      await sql`INSERT INTO bookings (typ, datum, cas) VALUES ('blokace', ${datum}, ${cas})`;
      res.status(200).json({ ok: true, zablokovano: 1 });
      return;
    }

    res.status(400).json({ ok: false, error: 'Neznámý režim blokace.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Blokaci se nepodařilo uložit.' });
  }
};
