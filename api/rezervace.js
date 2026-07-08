const { neon } = require('@neondatabase/serverless');
const { slotyProDen } = require('./_hodiny');

function jeValidniEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function poslatEmaily({ jmeno, email, telefon, sluzba, datum, cas, poznamka }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY není nastaven — e-mail se přeskakuje (rezervace je i tak uložená).');
    return;
  }

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const odesilatel = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const majitelEmail = process.env.OWNER_EMAIL || odesilatel;

  const detaily = `Služba: ${sluzba}\nDatum: ${datum}\nČas: ${cas}\nJméno: ${jmeno}\nTelefon: ${telefon}\nE-mail: ${email}${poznamka ? `\nPoznámka: ${poznamka}` : ''}`;

  await Promise.allSettled([
    resend.emails.send({
      from: odesilatel,
      to: email,
      subject: 'Potvrzení rezervace — Iron & Oak Barbershop',
      text: `Dobrý den ${jmeno},\n\nvaše rezervace byla přijata:\n\n${detaily}\n\nTěšíme se na vás.\nIron & Oak Barbershop`,
    }),
    resend.emails.send({
      from: odesilatel,
      to: majitelEmail,
      subject: 'Nová rezervace',
      text: `Přišla nová rezervace:\n\n${detaily}`,
    }),
  ]);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Metoda není povolena.' });
    return;
  }

  const { jmeno, telefon, email, sluzba, datum, cas, poznamka } = req.body || {};

  if (!jmeno || !telefon || !email || !sluzba || !datum || !cas) {
    res.status(400).json({ ok: false, error: 'Vyplňte prosím všechna povinná pole.' });
    return;
  }
  if (!jeValidniEmail(email)) {
    res.status(400).json({ ok: false, error: 'Zadejte platný e-mail.' });
    return;
  }

  const dostupneSloty = slotyProDen(datum);
  if (!dostupneSloty.includes(cas)) {
    res.status(400).json({ ok: false, error: 'Zvolený termín je mimo otevírací dobu.' });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const existuje = await sql`SELECT id FROM bookings WHERE datum = ${datum} AND cas = ${cas}`;
    if (existuje.length > 0) {
      res.status(409).json({ ok: false, error: 'Tento termín je již obsazený, zvolte prosím jiný.' });
      return;
    }

    await sql`
      INSERT INTO bookings (jmeno, telefon, email, sluzba, datum, cas, poznamka)
      VALUES (${jmeno}, ${telefon}, ${email}, ${sluzba}, ${datum}, ${cas}, ${poznamka || null})
    `;

    poslatEmaily({ jmeno, email, telefon, sluzba, datum, cas, poznamka }).catch((e) =>
      console.error('Chyba při odesílání e-mailu:', e)
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    if (err && err.code === '23505') {
      res.status(409).json({ ok: false, error: 'Tento termín je již obsazený, zvolte prosím jiný.' });
      return;
    }
    console.error(err);
    res.status(500).json({ ok: false, error: 'Rezervaci se nepodařilo uložit, zkuste to prosím znovu.' });
  }
};
