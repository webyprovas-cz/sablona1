document.getElementById('year').textContent = new Date().getFullYear();

const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// Rezervační formulář
const rezForm = document.getElementById('rezervace-form');
if (rezForm) {
  const datumInput = document.getElementById('rez-datum');
  const casSelect = document.getElementById('rez-cas');
  const zprava = document.getElementById('rez-zprava');

  const dnes = new Date().toISOString().slice(0, 10);
  datumInput.min = dnes;

  datumInput.addEventListener('change', async () => {
    casSelect.disabled = true;
    casSelect.innerHTML = '<option value="">Načítám dostupné časy…</option>';
    zprava.textContent = '';
    zprava.className = 'rez-zprava';

    try {
      const res = await fetch(`/api/sloty?datum=${datumInput.value}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Chyba');

      if (data.sloty.length === 0) {
        casSelect.innerHTML = '<option value="">Tento den je plně obsazen nebo zavřeno</option>';
        return;
      }
      casSelect.innerHTML =
        '<option value="">Vyberte čas…</option>' +
        data.sloty.map((t) => `<option value="${t}">${t}</option>`).join('');
      casSelect.disabled = false;
    } catch (e) {
      casSelect.innerHTML = '<option value="">Nepodařilo se načíst dostupné časy</option>';
    }
  });

  rezForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = rezForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    zprava.textContent = 'Odesílám…';
    zprava.className = 'rez-zprava';

    const formData = new FormData(rezForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/rezervace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Rezervaci se nepodařilo odeslat.');

      zprava.textContent = 'Rezervace byla úspěšně přijata. Potvrzení jsme odeslali na váš e-mail.';
      zprava.className = 'rez-zprava ok';
      rezForm.reset();
      casSelect.innerHTML = '<option value="">Nejdřív vyberte datum</option>';
      casSelect.disabled = true;
    } catch (err) {
      zprava.textContent = err.message;
      zprava.className = 'rez-zprava err';
    } finally {
      submitBtn.disabled = false;
    }
  });
}
