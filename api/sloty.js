const { neon } = require('@neondatabase/serverless');
const { slotyProDen } = require('./_hodiny');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Metoda není povolena.' });
    return;
  }

  const datum = req.query.datum;
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    res.status(400).json({ ok: false, error: 'Chybí nebo je neplatné datum.' });
    return;
  }

  const vsechnySloty = slotyProDen(datum);
  if (vsechnySloty.length === 0) {
    res.status(200).json({ ok: true, sloty: [] });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const obsazene = await sql`SELECT cas FROM bookings WHERE datum = ${datum}`;
    const obsazeneSet = new Set(obsazene.map((r) => r.cas.slice(0, 5)));

    const dnes = new Date();
    const jeDnes = datum === dnes.toISOString().slice(0, 10);
    const ted = dnes.getHours() * 60 + dnes.getMinutes();

    const volne = vsechnySloty.filter((cas) => {
      if (obsazeneSet.has(cas)) return false;
      if (jeDnes) {
        const [h, m] = cas.split(':').map(Number);
        if (h * 60 + m <= ted) return false;
      }
      return true;
    });

    res.status(200).json({ ok: true, sloty: volne });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Nepodařilo se načíst dostupné termíny.' });
  }
};
