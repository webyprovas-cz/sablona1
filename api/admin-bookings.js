const { neon } = require('@neondatabase/serverless');

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

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) {
      res.status(400).json({ ok: false, error: 'Chybí id rezervace.' });
      return;
    }
    try {
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: 'Nepodařilo se smazat rezervaci.' });
    }
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Metoda není povolena.' });
    return;
  }

  try {
    const rezervace = await sql`
      SELECT id, jmeno, telefon, email, sluzba, datum, cas, poznamka, created_at
      FROM bookings
      ORDER BY datum ASC, cas ASC
    `;
    res.status(200).json({ ok: true, rezervace });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Nepodařilo se načíst rezervace.' });
  }
};
