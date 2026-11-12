const $ = (query) => document.querySelector(query);
const key = 'kielipuro-demo-v1';
let completed = false;
try { completed = localStorage.getItem(key) === 'done'; } catch { $('#saved').textContent = 'Tallennus ei ole käytettävissä. Voit silti kokeilla tehtävää.'; }
function showCompletion(focus = false) {
  $('#exercise').hidden = true;
  $('#complete').hidden = false;
  if (focus) $('#complete').focus();
}
if (completed) showCompletion();
$('#answers').addEventListener('change', () => { $('#check').disabled = false; $('#answer-result').textContent = ''; });
$('#check').addEventListener('click', () => {
  if ($('#check').dataset.next === 'true') {
    showCompletion(true);
    try { localStorage.setItem(key, 'done'); } catch { $('#saved').textContent = 'Kokeilu tehty. Selaimesi ei salli tilan tallennusta.'; }
    return;
  }
  const correct = $('input[name=answer]:checked')?.value === 'hello';
  $('#answer-result').textContent = correct ? 'Oikein! こんにちは on päiväsaikaan käytettävä tervehdys.' : 'Hyvä kokeilu! こんにちは tarkoittaa hei tai hyvää päivää. Voit jatkaa myös tämän vastauksen jälkeen.';
  $('#answers').disabled = true;
  $('#check').textContent = 'Valmis →';
  $('#check').dataset.next = 'true';
});
$('#again').addEventListener('click', () => {
  $('#exercise').hidden = false; $('#complete').hidden = true; $('#answers').disabled = false;
  document.querySelectorAll('input[name=answer]').forEach(input => { input.checked = false; });
  $('#answer-result').textContent = ''; $('#check').textContent = 'Tarkista vastaus →'; $('#check').dataset.next = 'false'; $('#check').disabled = true;
  try { localStorage.removeItem(key); } catch { /* Practice works without persistence. */ }
  $('input[name=answer]').focus();
});
$('#feedback-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const title = String(data.get('title')).trim();
  const details = String(data.get('details')).trim();
  if (!title || !details) { $('#form-status').textContent = 'Täytä otsikko ja havainto ennen jatkamista.'; return; }
  const body = `### Palautteen tyyppi\n${data.get('category')}\n\n### Havainto tai idea\n${details}\n\n### Tausta\n${data.get('experience')}\nUseiden kielten opiskelukokemus: ${data.has('multilingual') ? 'kyllä' : 'ei ilmoitettu'}\n\n### Lähde\nKielipuron verkkosovellus\n\nTämä on ehdotus, ei toteutuslupa.`;
  const url = new URL('https://github.com/ljack/kielipuro/issues/new');
  url.search = new URLSearchParams({ title, body, labels: 'feedback,needs-owner-approval' });
  const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Avaa esitäytetty ehdotus GitHubissa';
  $('#form-status').replaceChildren('Palaute ei ole vielä lähetetty. ', link);
  window.open(url, '_blank', 'noopener,noreferrer');
});
fetch('/api/status').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(status => {
  $('#slack-status').textContent = status.slackConfigured ? 'Botti on määritetty. Mainitse @Kielipuro palautekanavalla ja jatka keskustelua samassa ketjussa. Viestit kopioidaan julkiseen GitHubiin.' : 'Slack-botti odottaa vielä yhdistämistä. Voit jo nyt antaa palautetta GitHubissa.';
}).catch(() => { $('#slack-status').textContent = 'Slack-yhteyden tilaa ei saatu tarkistettua. Anna palaute GitHubissa.'; });
