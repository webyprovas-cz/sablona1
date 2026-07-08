// Otevírací doba a generování časových slotů (sdíleno mezi API funkcemi)
const OTEVIRACI_DOBA = {
  0: null, // neděle - zavřeno
  1: ['09:00', '20:00'],
  2: ['09:00', '20:00'],
  3: ['09:00', '20:00'],
  4: ['09:00', '20:00'],
  5: ['09:00', '20:00'],
  6: ['09:00', '15:00'],
};

const KROK_MINUT = 30;

function slotyProDen(datumStr) {
  const datum = new Date(`${datumStr}T00:00:00`);
  if (Number.isNaN(datum.getTime())) return [];
  const rozsah = OTEVIRACI_DOBA[datum.getDay()];
  if (!rozsah) return [];

  const [odStr, doStr] = rozsah;
  const [odH, odM] = odStr.split(':').map(Number);
  const [doH, doM] = doStr.split(':').map(Number);

  const sloty = [];
  let minuty = odH * 60 + odM;
  const konecMinuty = doH * 60 + doM;

  while (minuty < konecMinuty) {
    const h = String(Math.floor(minuty / 60)).padStart(2, '0');
    const m = String(minuty % 60).padStart(2, '0');
    sloty.push(`${h}:${m}`);
    minuty += KROK_MINUT;
  }
  return sloty;
}

module.exports = { OTEVIRACI_DOBA, slotyProDen };
