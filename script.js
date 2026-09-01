// ============ CONFIG ============
const LOCK_ANSWER_HASH = "2ec07897c36a3cb331bc04f8b9776b27c6f3d65f57f2d1f68d684e0f5f407a25";

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fecha de inicio (formato: "AAAA-MM-DD")
const START_DATE = "2022-01-22";

// Variable del contador declarada
let counterInterval = null;

// ============ ALMACENAMIENTO SEGURO ============
// Envolvemos localStorage por si el navegador lo bloquea (p.ej. al abrir el
// archivo con doble clic en vez de servirlo desde un servidor/GitHub Pages).
// Si falla, seguimos funcionando igual, solo que sin recordar el progreso.
function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* almacenamiento no disponible */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* almacenamiento no disponible */ }
}
function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch (e) { /* almacenamiento no disponible */ }
}

// ============ CANDADO DE ENTRADA ============
const lockScreen = document.getElementById('lock-screen');
const app = document.getElementById('app');
const lockForm = document.getElementById('lock-form');
const lockInput = document.getElementById('lock-answer');
const lockError = document.getElementById('lock-error');

// Si ya se abrió antes en este navegador, saltamos el candado
if (sessionGet('pochiapp_unlocked') === 'true') {
  showApp();
}

lockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = lockInput.value.trim().toLowerCase();
  const valueHash = await hashText(value);
  if (valueHash === LOCK_ANSWER_HASH) {
    sessionSet('pochiapp_unlocked', 'true');
    showApp();
  } else {
    lockError.hidden = false;
    lockInput.focus();
    lockInput.select();
  }
});

function showApp() {
  lockScreen.hidden = true;
  app.hidden = false;
  renderPoints();
  renderDaysCounter();
}

// ============ MURAL DE FOTOS: AMPLIAR AL PULSAR ============
const lightbox = document.getElementById('lightbox');
const lightboxPhoto = document.getElementById('lightbox-photo');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

document.querySelectorAll('.photo-cluster .mural-item').forEach(item => {
  item.addEventListener('click', () => {
    const photoEl = item.querySelector('.polaroid-photo');
    const captionEl = item.querySelector('.polaroid-caption');
    const img = photoEl.tagName === 'IMG' ? photoEl : photoEl.querySelector('img');
    if (img) {
      lightboxPhoto.innerHTML = img.outerHTML;
    } else {
      lightboxPhoto.textContent = photoEl.dataset.placeholder || '';
    }
    lightboxCaption.textContent = captionEl ? captionEl.textContent : '';
    lightbox.hidden = false;
  });
});

function closeLightbox() { lightbox.hidden = true; }
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

// ============ MODAL DE CONFIRMACIÓN (reutilizable) ============
const confirmModal = document.getElementById('confirm-modal');
const modalMessage = document.getElementById('modal-message');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalConfirmBtn = document.getElementById('modal-confirm');
let modalOnConfirm = null;

function showConfirm(message, onConfirm) {
  modalMessage.textContent = message;
  modalOnConfirm = onConfirm;
  confirmModal.hidden = false;
}

function hideConfirm() {
  confirmModal.hidden = true;
  modalOnConfirm = null;
}

modalCancelBtn.addEventListener('click', hideConfirm);
modalConfirmBtn.addEventListener('click', () => {
  const callback = modalOnConfirm;
  hideConfirm();
  if (callback) callback();
});
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) hideConfirm();
});

// ============ REINICIO TOTAL ============
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
  btnReset.addEventListener('click', () => {
    showConfirm('🔴 ¿Reiniciar toda la app? Se perderá el progreso de PochiCoins y premios canjeados.', resetApp);
  });
}

function resetApp() {
  try { sessionStorage.removeItem('pochiapp_unlocked'); } catch (e) {}
  ['pochiapp_points', 'pochiapp_redeemed', 'pochiapp_cooldown_trivia', 'pochiapp_cooldown_memory', 'pochiapp_cooldown_flashback', 'pochiapp_cooldown_quotes', 'pochiapp_cooldown_food', 'pochiapp_session_trivia', 'pochiapp_session_memory', 'pochiapp_session_flashback', 'pochiapp_session_quotes', 'pochiapp_session_food'].forEach(key => {
    try { localStorage.removeItem(key); } catch (e) { /* almacenamiento no disponible */ }
  });
  location.reload();
}

// ============ CONTADOR DE TIEMPO JUNTOS (en vivo) ============
function diffBreakdown(start, now) {
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months--;
  }
  if (months < 0) { months += 12; years--; }

  return { years, months, days, hours, minutes, seconds };
}

function renderDaysCounter() {
  const yearsEl = document.getElementById('c-years');
  if (!yearsEl) return;

  const start = new Date(START_DATE + 'T00:00:00');

  function tick() {
    const now = new Date();
    const diff = diffBreakdown(start, now);
    document.getElementById('c-years').textContent = Math.max(0, diff.years);
    document.getElementById('c-months').textContent = Math.max(0, diff.months);
    document.getElementById('c-days').textContent = Math.max(0, diff.days);
    document.getElementById('c-hours').textContent = String(Math.max(0, diff.hours)).padStart(2, '0');
    document.getElementById('c-minutes').textContent = String(Math.max(0, diff.minutes)).padStart(2, '0');
    document.getElementById('c-seconds').textContent = String(Math.max(0, diff.seconds)).padStart(2, '0');
  }

  tick();
  if (counterInterval) clearInterval(counterInterval);
  counterInterval = setInterval(tick, 1000);
}

// ============ NAVEGACIÓN ENTRE PESTAÑAS ============
const tabButtons = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section;

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    panels.forEach(p => p.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

// ============ SISTEMA DE PUNTOS (base) ============
// Puntos guardados en localStorage, listos para que los juegos y premios los usen
function getPoints() {
  return parseInt(safeGet('pochiapp_points') || '0', 10);
}

function addPoints(amount) {
  const current = getPoints();
  const updated = current + amount;
  safeSet('pochiapp_points', String(updated));
  renderPoints();
  if (typeof renderPremios === 'function') renderPremios();
  return updated;
}

function renderPoints() {
  document.getElementById('points-count').textContent = getPoints();
}

// ============ IDEAS DE CITAS ============
const DATE_IDEAS = [
  { cat: 'casa', tag: 'Home & Chill', title: 'Maratón con tema sorpresa 🎞️', desc: 'Cada uno elige una peli sin decir el motivo y hay que adivinar por qué la escogió el otro.', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: 'Cena pujada 🍳', desc: 'Los dos empezamos con el mismo dinero imaginario y pujamos por diferentes partes de la cena.', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: 'Pódcast y debate ✍️', desc: 'Sorteamos la postura que defiende cada uno y tomamos notas de un vídeo corto.', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: 'Charades 🙆‍♂️', desc: 'Jugamos a adivinar la palabra por mímica.', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: 'Jenga prend-ido 😳', desc: 'Si se te cae la torre, pierdes prenda...', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: '¿Quién sabe más sobre...? 🤔', desc: 'Cada uno elige un vídeo de preguntas de una temática y gana quién más preguntas acierte en total.', cost: 'Gratis' },
  { cat: 'casa', tag: 'Home & Chill', title: 'Gaming goals 🕹️', desc: 'Jugamos videojuegos en la TV hasta ver quién se pica (spoiler: Leire).', cost: 'Gratis' },

  { cat: 'gastro', tag: 'Gastro', title: 'Competición de pintxos 🥪', desc: 'Cada uno organiza un menú de 3 pintxos diferentes y puntuamos presentación y sabor.', cost: 'Gratis/€' },
  { cat: 'gastro', tag: 'Gastro', title: 'Pintxo-pote en Casco Viejo 🍡', desc: 'Probamos un pintxo distinto en cada bar, sin repetir.', cost: '€' },
  { cat: 'gastro', tag: 'Gastro', title: 'Hambre a ciegas 🫣', desc: 'Cuando pidamos cena a domicilio, elegimos la comida del otro.', cost: '€' },
  { cat: 'gastro', tag: 'Gastro', title: 'Desayuno en Deusto al amanecer 🌇', desc: 'Cada uno elige lo que el otro toma y puntuamos cuánto nos conocemos.', cost: '€' },

  { cat: 'cultura', tag: 'Cultura', title: 'Concurso de fotografía 🌈', desc: 'Sorteamos un color para cada uno y construimos un cuadro de fotos solamente de ese color.', cost: 'Gratis' },
  { cat: 'cultura', tag: 'Cultura', title: 'Tarde de Ikea 🪟', desc: 'Construimos la casa de nuestros sueñosss.', cost: 'Gratis' },
  { cat: 'cultura', tag: 'Cultura', title: 'Jugones de mesa ♟️', desc: 'Nos pateamos todas las jugueterías hasta encontrar el juego de mesa perfecto.', cost: '€' },
  { cat: 'cultura', tag: 'Cultura', title: 'Tarde de compras 🧥', desc: 'Nos recorremos todo Bilbao y cada uno le elige una prenda de ropa al otro sin poder opinar.', cost: '€€' },
  { cat: 'cultura', tag: 'Cultura', title: 'Escape room en equipo ⚙️', desc: 'Nos apuntamos y quien descubra más pistas gana :)', cost: '€€' },

  { cat: 'aire', tag: 'Aire libre', title: 'Senderismo y checklist 🍀', desc: 'Subimos a un monte, llevamos comida, y jugamos a tachar una lista de objetos/animales a encontrar.', cost: 'Gratis' },
  { cat: 'aire', tag: 'Aire libre', title: 'Partidazo de palas 🏓', desc: 'Bajamos a la playa y echamos una pachanga seria, con campo y red.', cost: 'Gratis' },
  { cat: 'aire', tag: 'Aire libre', title: 'Tardeo en la costa 🌅', desc: 'Damos un paseo, hacemos un picnic con ingredientes por sorteo, y vemos el sunset.', cost: '€' },
  { cat: 'aire', tag: 'Aire libre', title: 'Cena con vistas y papeo 🍙', desc: 'Visitamos un MUY buen restaurante en Artxanda, para una ocasión que merezca la pena ponerse guapetes.', cost: '€€' },
];

const TAG_CLASS = { casa: 'tag-casa', gastro: 'tag-gastro', cultura: 'tag-cultura', aire: 'tag-aire', especial: 'tag-especial' };

let citasFilter = 'todas';

function citaCardHTML(idea, extraClass = '') {
  return `
    <div class="cita-card ${extraClass}">
      <span class="cita-tag ${TAG_CLASS[idea.cat]}">${idea.tag}</span>
      <h3 class="cita-title">${idea.title}</h3>
      <p class="cita-desc">${idea.desc}</p>
      <p class="cita-cost">${idea.cost}</p>
    </div>`;
}

function renderCitas() {
  const grid = document.getElementById('citas-grid');
  if (!grid) return;
  const list = citasFilter === 'todas' ? DATE_IDEAS : DATE_IDEAS.filter(i => i.cat === citasFilter);
  grid.innerHTML = list.map(idea => citaCardHTML(idea)).join('');
}

const chipRow = document.getElementById('chip-row');
if (chipRow) {
  chipRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    citasFilter = btn.dataset.cat;
    renderCitas();
  });
}

const btnSurprise = document.getElementById('btn-surprise');
if (btnSurprise) {
  btnSurprise.addEventListener('click', () => {
    const pool = citasFilter === 'todas' ? DATE_IDEAS : DATE_IDEAS.filter(i => i.cat === citasFilter);
    const idea = pool[Math.floor(Math.random() * pool.length)];
    const grid = document.getElementById('citas-grid');
    grid.innerHTML = citaCardHTML(idea, 'surprise-card');
  });
}

renderCitas();

// ============ JUEGOS: NAVEGACIÓN DEL HUB ============
const gameHub = document.getElementById('game-hub');
const gameAreas = { trivia: document.getElementById('game-trivia'), memory: document.getElementById('game-memory'), flashback: document.getElementById('game-flashback'), quotes: document.getElementById('game-quotes'), food: document.getElementById('game-food') };

const RISKY_GAMES = ['trivia', 'flashback', 'quotes'];

function launchGame(game) {
  gameHub.hidden = true;
  Object.values(gameAreas).forEach(a => a.hidden = true);
  gameAreas[game].hidden = false;
  if (game === 'trivia') startTrivia();
  if (game === 'memory') startMemory();
  if (game === 'flashback') startFlashback();
  if (game === 'quotes') startQuotes();
  if (game === 'food') startFood();
}

if (gameHub) {
  gameHub.addEventListener('click', (e) => {
    const btn = e.target.closest('.game-card');
    if (!btn || btn.classList.contains('is-cooldown')) return;
    const game = btn.dataset.game;
    if (RISKY_GAMES.includes(game)) {
      showConfirm('⚠️ ¡Cuidado! Este juego también resta PochiCoins por fallar. ¿Quieres jugar igualmente?', () => launchGame(game));
    } else {
      launchGame(game);
    }
  });
}

document.querySelectorAll('.btn-back').forEach(btn => {
  btn.addEventListener('click', () => {
    Object.values(gameAreas).forEach(a => a.hidden = true);
    gameHub.hidden = false;
    updateGameHubState();
  });
});

// ============ COOLDOWN DE 24H POR JUEGO ============
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
let gameHubInterval = null;

function getCooldownEnd(game) {
  const ts = safeGet(`pochiapp_cooldown_${game}`);
  if (!ts) return null;
  return Number(ts) + COOLDOWN_MS;
}

function setCooldownNow(game) {
  safeSet(`pochiapp_cooldown_${game}`, String(Date.now()));
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}h ${m}m`;
}

function updateGameHubState() {
  document.querySelectorAll('.game-card').forEach(btn => {
    const game = btn.dataset.game;
    const end = getCooldownEnd(game);
    let badge = btn.querySelector('.game-cooldown');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'game-cooldown';
      btn.appendChild(badge);
    }
    if (end && Date.now() < end) {
      btn.classList.add('is-cooldown');
      badge.hidden = false;
      badge.textContent = formatRemaining(end - Date.now());
    } else {
      btn.classList.remove('is-cooldown');
      badge.hidden = true;
    }
  });
}

updateGameHubState();
if (gameHubInterval) clearInterval(gameHubInterval);
gameHubInterval = setInterval(updateGameHubState, 1000);

// ============ I KNOW U BEST ============ 12
// Cada partida elige 3 al azar de esta lista.
// "correct" es el índice (empezando en 0) de la opción correcta dentro de "options".
const TRIVIA_QUESTIONS_POOL = [
  { q: '¿Cuál es la SEGUNDA serie favorita de Sergio?', options: ['Game of Thrones', 'Dark', 'Lost', 'Vikings'], correct: 3 },
  { q: '¿Cuál es la película favorita de Sergio?', options: ['El código Da Vinci', 'Los juegos del hambre', 'Shutter Island', 'The girl next door'], correct: 3 },
  { q: '¿Cuál es el mejor topping del poke bowl para Sergio?', options: ['Tacos de queso', 'Huevo cocido', 'Queso crema', 'Tacos de mango'], correct: 2 },
  { q: '¿Quién le pidió al otro salir? jeje', options: ['Leire', 'Sergio', 'Losh dosh ayudamos', 'Ni me acuerdo'], correct: 2 },
  { q: '¿Qué personaje de GOT es el favorito de Sergio?', options: ['Tyrion Lannister', 'Daenerys Targaryen', 'Jon Snow', 'Arya Stark'], correct: 0 },
  { q: '¿Qué personaje de GOT es el más odiado por Sergio?', options: ['Stannis Baratheon', 'Cersei Lannister', 'Joffrey Baratheon', 'Varys'], correct: 1 }, 
  { q: '¿Cuál es la comida favorita de Sergio?', options: ['Algo con crema pastelera', 'Aguja guisada', 'Aquella tarta de nueces...', 'Costilla guisada'], correct: 1 },
  { q: '¿Qué se encuentra SIEMPRE Sergio en el suelo de tu habitación?', options: ['Bastoncillos', 'Céntimos', 'Zapatillas', 'Peluches'], correct: 2 },
  { q: '¿Cuál es la prenda favorita de Sergio regalada por ti?', options: ['Camiseta negra de Carhartt', 'Zapatillas azules', 'Sudadera verde de P&B', 'Camiseta negra de besos'], correct: 3 },
  { q: '¿Dónde lo hicimos primero :P?', options: ["Sergi's cama", "Leire's cama", "Leire's mesa", "Leire's salón"], correct: 0 },
  { q: '¿Qué película vista en el cine le gustó más a Sergio?', options: ['Tadeo Jones 3', 'Anyone but you', 'La sirenita', 'Avatar 2'], correct: 3 },
  { q: '¿Cuál es el mejor hotel en el que nos hemos alojado? El de...', options: ['Sanse', 'Londres', 'Venecia', 'Roma'], correct: 0 },
  { q: '¿Qué especialidad querría hacer Sergio cuando se gradúe?', options: ['Ciberseguridad', 'Finanzas', 'Ingeniero de IA', 'No tiene ni idea'], correct: 1 },
  { q: '¿Qué le da más rabia de ti a Sergio?', options: ['Mordiscos random', 'Pararte de repente mientras andamos', 'Seguir cantando mientras te hablo', 'Mi novia es perfecta, nada me da rabia'], correct: 2 },
  { q: '¿Qué es lo que más le gusta de ti a Sergio?', options: ['Cosquillitas', 'Voz de baby', 'Agarrarte a mi brazo', 'Abrazos por detrás'], correct: 2 },
  { q: '¿Cuál es el jugador de fútbol favorito de Sergio?', options: ['Jan Oblak', 'Antoine Griezmann', 'Marc Pubill', 'Marcos Llorente'], correct: 0 },
  { q: '¿Cuál es el SEGUNDO deporte favorito de Sergio?', options: ['Pádel', 'Tenis', 'Fútbol', 'Ping pong'], correct: 1 },
  { q: '¿En qué época/lugar viviría Sergio si pudiera viajar en el tiempo?', options: ['Imperio Romano', 'Los noventa', '2100', 'Los sesenta'], correct: 1 },
  { q: '¿Cuál es la jugadora de tenis favorita de Sergio?', options: ['Aryna Sabalenka', 'Mirra Andreeva', 'Iga Swiatek', 'Elena Rybakina'], correct: 3 },
  { q: '¿Cuál de estos apellidos NO tiene Sergio?', options: ['Fernández', 'Quintás', 'Gimeno', 'López'], correct: 0 },
];

let currentTriviaQuestions = [];
let triviaIndex = 0;
let triviaCorrectCount = 0;
let triviaPoints = 0;
const POINTS_PER_CORRECT = 4;
const POINTS_PENALTY_WRONG = 2;

function startTrivia() {
  const saved = safeGet('pochiapp_session_trivia');
  if (saved) {
    currentTriviaQuestions = JSON.parse(saved);
  } else {
    currentTriviaQuestions = shuffle(TRIVIA_QUESTIONS_POOL).slice(0, 3);
    safeSet('pochiapp_session_trivia', JSON.stringify(currentTriviaQuestions));
  }
  triviaIndex = 0;
  triviaCorrectCount = 0;
  triviaPoints = 0;
  renderTriviaQuestion();
}

function renderTriviaQuestion() {
  const wrap = document.getElementById('trivia-wrap');
  if (triviaIndex >= currentTriviaQuestions.length) {
    wrap.innerHTML = `
      <div class="trivia-summary">
        <p>Has acertado</p>
        <p class="big">${triviaCorrectCount} / ${currentTriviaQuestions.length}</p>
        <p>${triviaPoints >= 0 ? '+ ' : ''}🪙 ${triviaPoints} PochiCoins ${triviaPoints >= 0 ? 'ganadas 🤩' : 'perdidas 😭'}</p>
      </div>`;
    addPoints(triviaPoints);
    setCooldownNow('trivia');
    safeRemove('pochiapp_session_trivia');
    updateGameHubState();
    return;
  }

  const item = currentTriviaQuestions[triviaIndex];
  wrap.innerHTML = `
    <div class="trivia-card">
      <p class="trivia-progress">Pregunta ${triviaIndex + 1} de ${currentTriviaQuestions.length}</p>
      <p class="trivia-question">${item.q}</p>
      <div class="trivia-options" id="trivia-options"></div>
    </div>`;

  const optionsWrap = document.getElementById('trivia-options');
  item.options.forEach((opt, i) => {
    const optBtn = document.createElement('button');
    optBtn.className = 'trivia-option';
    optBtn.textContent = opt;
    optBtn.addEventListener('click', () => answerTrivia(i));
    optionsWrap.appendChild(optBtn);
  });
}

function answerTrivia(selectedIndex) {
  const item = currentTriviaQuestions[triviaIndex];
  const optionButtons = document.querySelectorAll('#trivia-options .trivia-option');
  optionButtons.forEach((b, i) => {
    b.disabled = true;
    if (i === item.correct) b.classList.add('correct');
    else if (i === selectedIndex) b.classList.add('incorrect');
  });

  if (selectedIndex === item.correct) {
    triviaCorrectCount++;
    triviaPoints += POINTS_PER_CORRECT;
  } else {
    triviaPoints -= POINTS_PENALTY_WRONG;
  }

  const wrap = document.getElementById('trivia-wrap');
  const nextBtn = document.createElement('button');
  nextBtn.className = 'trivia-next';
  nextBtn.textContent = (triviaIndex + 1 < currentTriviaQuestions.length) ? 'Siguiente ↪' : 'Ver resultado';
  nextBtn.addEventListener('click', () => {
    triviaIndex++;
    renderTriviaQuestion();
  });
  wrap.querySelector('.trivia-card').appendChild(nextBtn);
}

// ============ BONI HAS NO MEMORY ============ 10
const MEMORY_PHOTOS = [
  { id: 1, label: 'Foto 1', src: 'assets/memory/m1.jpg' },
  { id: 2, label: 'Foto 2', src: 'assets/memory/m2.jpg' },
  { id: 3, label: 'Foto 3', src: 'assets/memory/m3.jpg' },
  { id: 4, label: 'Foto 4', src: 'assets/memory/m4.jpg' },
  { id: 5, label: 'Foto 5', src: 'assets/memory/m5.jpg' },
  { id: 6, label: 'Foto 6', src: 'assets/memory/m6.jpg' },
  { id: 7, label: 'Foto 7', src: 'assets/memory/m7.jpg' },
  { id: 8, label: 'Foto 8', src: 'assets/memory/m8.jpg' },
  { id: 9, label: 'Foto 9', src: 'assets/memory/m9.jpg' },
  { id: 10, label: 'Foto 10', src: 'assets/memory/m10.jpg' },
  { id: 11, label: 'Foto 11', src: 'assets/memory/m11.jpg' },
  { id: 12, label: 'Foto 12', src: 'assets/memory/m12.jpg' },
  { id: 13, label: 'Foto 13', src: 'assets/memory/m13.jpg' },
  { id: 14, label: 'Foto 14', src: 'assets/memory/m14.jpg' },
  { id: 15, label: 'Foto 15', src: 'assets/memory/m15.jpg' },
  { id: 16, label: 'Foto 16', src: 'assets/memory/m16.jpg' },
  { id: 17, label: 'Foto 17', src: 'assets/memory/m17.jpg' },
  { id: 18, label: 'Foto 18', src: 'assets/memory/m18.jpg' },
  { id: 19, label: 'Foto 19', src: 'assets/memory/m19.jpg' },
  { id: 20, label: 'Foto 20', src: 'assets/memory/m20.jpg' },
  { id: 21, label: 'Foto 21', src: 'assets/memory/m21.jpg' },
  { id: 22, label: 'Foto 22', src: 'assets/memory/m22.jpg' },
  { id: 23, label: 'Foto 23', src: 'assets/memory/m23.jpg' },
  { id: 24, label: 'Foto 24', src: 'assets/memory/m24.jpg' },
  { id: 25, label: 'Foto 25', src: 'assets/memory/m25.jpg' },
  { id: 26, label: 'Foto 26', src: 'assets/memory/m26.jpg' },
  { id: 27, label: 'Foto 27', src: 'assets/memory/m27.jpg' },
  { id: 28, label: 'Foto 28', src: 'assets/memory/m28.jpg' },
  { id: 29, label: 'Foto 29', src: 'assets/memory/m29.jpg' },
  { id: 30, label: 'Foto 30', src: 'assets/memory/m30.jpg' },
  { id: 31, label: 'Foto 31', src: 'assets/memory/m31.jpg' },
  { id: 32, label: 'Foto 32', src: 'assets/memory/m32.jpg' },
  { id: 33, label: 'Foto 33', src: 'assets/memory/m33.jpg' },
  { id: 34, label: 'Foto 34', src: 'assets/memory/m34.jpg' },
  { id: 35, label: 'Foto 35', src: 'assets/memory/m35.jpg' },
  { id: 36, label: 'Foto 36', src: 'assets/memory/m36.jpg' },
  { id: 37, label: 'Foto 37', src: 'assets/memory/m37.jpg' },
  { id: 38, label: 'Foto 38', src: 'assets/memory/m38.jpg' },
  { id: 39, label: 'Foto 39', src: 'assets/memory/m39.jpg' },
  { id: 40, label: 'Foto 40', src: 'assets/memory/m40.jpg' },
  { id: 41, label: 'Foto 41', src: 'assets/memory/m41.jpg' },
  { id: 42, label: 'Foto 42', src: 'assets/memory/m42.jpg' },
  { id: 43, label: 'Foto 43', src: 'assets/memory/m43.jpg' },
  { id: 44, label: 'Foto 44', src: 'assets/memory/m44.jpg' },
  { id: 45, label: 'Foto 45', src: 'assets/memory/m45.jpg' },
  { id: 46, label: 'Foto 46', src: 'assets/memory/m46.jpg' },
  { id: 47, label: 'Foto 47', src: 'assets/memory/m47.jpg' },
  { id: 48, label: 'Foto 48', src: 'assets/memory/m48.jpg' },
  { id: 49, label: 'Foto 49', src: 'assets/memory/m49.jpg' },
  { id: 50, label: 'Foto 50', src: 'assets/memory/m50.jpg' },
];

let memoryState = [];
let memoryFlipped = [];
let memoryMoves = 0;
let memoryMatchedCount = 0;
let memoryLock = false;
let memoryHeartUnits = 10; // 10 medias unidades = 5 corazones llenos

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startMemory() {
  const saved = safeGet('pochiapp_session_memory');
  if (saved) {
    memoryState = JSON.parse(saved).map(t => ({ ...t, matched: false }));
  } else {
    const chosen = shuffle(MEMORY_PHOTOS).slice(0, 8);
    const pairs = shuffle([...chosen, ...chosen]);
    memoryState = pairs.map((photo, i) => ({ cardId: i, photoId: photo.id, label: photo.label, src: photo.src, matched: false }));
    safeSet('pochiapp_session_memory', JSON.stringify(memoryState));
  }
  memoryFlipped = [];
  memoryMoves = 0;
  memoryMatchedCount = 0;
  memoryLock = false;
  memoryHeartUnits = 10;
  document.getElementById('memory-result').hidden = true;
  renderHearts();
  renderMemoryGrid();
}

// Un corazón SVG simple, reutilizado como fondo (gris) y relleno (coral) recortado por %
function heartSVG(className) {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10.2-9.1C.3 9.1 1 5.7 4 4.2c2.3-1.1 4.7-.3 6 1.6 1.3-1.9 3.7-2.7 6-1.6 3 1.5 3.7 4.9 2.2 7.7C19.5 16.4 12 21 12 21z"/></svg>`;
}

function renderHearts() {
  const wrap = document.getElementById('memory-hearts');
  if (!wrap) return;
  let html = '';
  for (let i = 0; i < 5; i++) {
    const units = Math.max(0, Math.min(2, memoryHeartUnits - i * 2)); // 0, 1 o 2 por corazón
    const fillPct = (units / 2) * 100;
    html += `<span class="heart-icon">${heartSVG('heart-bg')}<span class="heart-fg-wrap" style="clip-path: inset(0 ${100 - fillPct}% 0 0)">${heartSVG('heart-fg')}</span></span>`;
  }
  wrap.innerHTML = html;
}

function memoryTileFaceHTML(tile) {
  if (tile.src) return `<img src="${tile.src}" alt="${tile.label}">`;
  return `<div class="memory-tile-photo placeholder-photo" data-placeholder="${tile.label}"></div>`;
}

function renderMemoryGrid() {
  const grid = document.getElementById('memory-grid');
  grid.innerHTML = memoryState.map(tile => `
      <button class="memory-tile" data-id="${tile.cardId}">
        <div class="memory-tile-inner">
          <div class="memory-tile-front">💌</div>
          <div class="memory-tile-back">${memoryTileFaceHTML(tile)}</div>
        </div>
      </button>`).join('');

  grid.querySelectorAll('.memory-tile').forEach(btn => {
    btn.addEventListener('click', () => flipMemoryTile(Number(btn.dataset.id)));
  });
}

function memoryTileEl(id) {
  return document.querySelector(`.memory-tile[data-id="${id}"]`);
}

function memorySetLock(locked) {
  document.querySelectorAll('.memory-tile').forEach(b => {
    const bTile = memoryState.find(t => t.cardId === Number(b.dataset.id));
    b.disabled = locked && !bTile.matched && !memoryFlipped.includes(bTile.cardId);
  });
}

function flipMemoryTile(id) {
  if (memoryLock) return;
  const tile = memoryState.find(t => t.cardId === id);
  if (!tile || tile.matched || memoryFlipped.includes(id)) return;

  memoryFlipped.push(id);
  memoryTileEl(id).classList.add('is-up');

  if (memoryFlipped.length === 2) {
    memoryMoves++;
    memoryLock = true;
    memorySetLock(true);

    const [firstId, secondId] = memoryFlipped;
    const first = memoryState.find(t => t.cardId === firstId);
    const second = memoryState.find(t => t.cardId === secondId);

    if (first.photoId === second.photoId) {
      first.matched = true;
      second.matched = true;
      memoryMatchedCount += 2;
      memoryTileEl(firstId).classList.add('matched');
      memoryTileEl(secondId).classList.add('matched');
      memoryFlipped = [];
      memoryLock = false;
      memorySetLock(false);
      memoryHeartUnits = Math.min(10, memoryHeartUnits + 1);
      renderHearts();
      if (memoryMatchedCount === memoryState.length) finishMemory();
    } else {
      memoryHeartUnits = Math.max(0, memoryHeartUnits - 1);
      renderHearts();
      setTimeout(() => {
        memoryTileEl(firstId).classList.remove('is-up');
        memoryTileEl(secondId).classList.remove('is-up');
        memoryFlipped = [];
        memoryLock = false;
        memorySetLock(false);
      }, 800);
    }
  }
}

function finishMemory() {
  // La puntuación depende directamente de cómo queden los corazones (0 a 10 medias unidades)
  const earned = memoryHeartUnits;
  const resultBox = document.getElementById('memory-result');
  resultBox.hidden = false;
  resultBox.innerHTML = `<p>¡Lo has completado en ${memoryMoves} intentos!</p><p class="big">+ 🪙 ${earned} PochiCoins</p>`;
  addPoints(earned);
  setCooldownNow('memory');
  safeRemove('pochiapp_session_memory');
  updateGameHubState();
}

// ============ FLASHBACK CHALLENGE ============ 12
// Cada partida elige 2 al azar de esta lista.
const FLASHBACK_PHOTOS = [
  { label: 'Foto 1', src: 'assets/flashback/f1.jpg', year: 2022, month: 4 },
  { label: 'Foto 2', src: 'assets/flashback/f2.jpg', year: 2022, month: 6 },
  { label: 'Foto 3', src: 'assets/flashback/f3.jpg', year: 2022, month: 8 },
  { label: 'Foto 4', src: 'assets/flashback/f4.jpg', year: 2022, month: 8 },
  { label: 'Foto 5', src: 'assets/flashback/f5.jpg', year: 2022, month: 8 },
  { label: 'Foto 6', src: 'assets/flashback/f6.jpg', year: 2022, month: 9 },
  { label: 'Foto 7', src: 'assets/flashback/f7.jpg', year: 2022, month: 9 },
  { label: 'Foto 8', src: 'assets/flashback/f8.jpg', year: 2022, month: 10 },
  { label: 'Foto 9', src: 'assets/flashback/f9.jpg', year: 2022, month: 11 },
  { label: 'Foto 10', src: 'assets/flashback/f10.jpg', year: 2022, month: 12 },
  { label: 'Foto 11', src: 'assets/flashback/f11.jpg', year: 2023, month: 2 },
  { label: 'Foto 12', src: 'assets/flashback/f12.jpg', year: 2023, month: 3 },
  { label: 'Foto 13', src: 'assets/flashback/f13.jpg', year: 2023, month: 4 },
  { label: 'Foto 14', src: 'assets/flashback/f14.jpg', year: 2023, month: 5 },
  { label: 'Foto 15', src: 'assets/flashback/f15.jpg', year: 2023, month: 6 },
  { label: 'Foto 16', src: 'assets/flashback/f16.jpg', year: 2023, month: 6 },
  { label: 'Foto 17', src: 'assets/flashback/f17.jpg', year: 2023, month: 8 },
  { label: 'Foto 18', src: 'assets/flashback/f18.jpg', year: 2023, month: 8 },
  { label: 'Foto 19', src: 'assets/flashback/f19.jpg', year: 2023, month: 8 },
  { label: 'Foto 20', src: 'assets/flashback/f20.jpg', year: 2023, month: 8 },
  { label: 'Foto 21', src: 'assets/flashback/f21.jpg', year: 2023, month: 10 },
  { label: 'Foto 22', src: 'assets/flashback/f22.jpg', year: 2023, month: 11 },
  { label: 'Foto 23', src: 'assets/flashback/f23.jpg', year: 2023, month: 12 },
  { label: 'Foto 24', src: 'assets/flashback/f24.jpg', year: 2024, month: 1 },
  { label: 'Foto 25', src: 'assets/flashback/f25.jpg', year: 2024, month: 8 },
  { label: 'Foto 26', src: 'assets/flashback/f26.jpg', year: 2024, month: 9 },
  { label: 'Foto 27', src: 'assets/flashback/f27.jpg', year: 2024, month: 10 },
  { label: 'Foto 28', src: 'assets/flashback/f28.jpg', year: 2024, month: 10 },
  { label: 'Foto 29', src: 'assets/flashback/f29.jpg', year: 2025, month: 5 },
  { label: 'Foto 30', src: 'assets/flashback/f30.jpg', year: 2025, month: 6 },
];

const FLASHBACK_START_YEAR = 2022;
const FLASHBACK_START_MONTH = 1; // enero
const FLASHBACK_END_YEAR = 2026;
const FLASHBACK_END_MONTH = 6; // junio
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthYearToIndex(year, month) {
  return (year - FLASHBACK_START_YEAR) * 12 + (month - FLASHBACK_START_MONTH);
}
const FLASHBACK_MAX_INDEX = monthYearToIndex(FLASHBACK_END_YEAR, FLASHBACK_END_MONTH);

function indexToLabel(idx) {
  const month = idx % 12;
  const year = FLASHBACK_START_YEAR + Math.floor(idx / 12);
  return `${MONTH_NAMES[month]} ${year}`;
}

function scoreForDistance(distanceMonths) {
  if (distanceMonths === 0) return 6;
  if (distanceMonths <= 12) return 6 - Math.ceil(distanceMonths/2);
  return -Math.min(6, (Math.ceil(distanceMonths/2) - 6));
}

let flashbackRounds = [];
let flashbackRoundIndex = 0;
let flashbackTotalScore = 0;

function startFlashback() {
  const saved = safeGet('pochiapp_session_flashback');
  if (saved) {
    flashbackRounds = JSON.parse(saved);
  } else {
    flashbackRounds = shuffle(FLASHBACK_PHOTOS).slice(0, 2);
    safeSet('pochiapp_session_flashback', JSON.stringify(flashbackRounds));
  }
  flashbackRoundIndex = 0;
  flashbackTotalScore = 0;
  renderFlashbackRound();
}

function renderFlashbackRound() {
  const wrap = document.getElementById('flashback-wrap');
  if (flashbackRoundIndex >= flashbackRounds.length) {
    wrap.innerHTML = `
      <div class="flashback-summary">
        <p>Puntuación total:</p>
        <p class="big">${flashbackTotalScore}</p>
        <p>🪙 ${flashbackTotalScore} PochiCoins ${flashbackTotalScore >= 0 ? 'ganadas 🤩' : 'perdidas 😭'}</p>
      </div>`;
    addPoints(flashbackTotalScore);
    setCooldownNow('flashback');
    safeRemove('pochiapp_session_flashback');
    updateGameHubState();
    return;
  }

  const photo = flashbackRounds[flashbackRoundIndex];
  const midIndex = Math.round(FLASHBACK_MAX_INDEX / 2);

  wrap.innerHTML = `
    <div class="flashback-card">
      <p class="flashback-progress">Foto ${flashbackRoundIndex + 1} de ${flashbackRounds.length}</p>
      <div class="flashback-photo">
        ${photo.src ? `<img class="polaroid-photo" src="${photo.src}" alt="${photo.label}">` : `<div class="polaroid-photo placeholder-photo" data-placeholder="${photo.label}"></div>`}
      </div>
      <p class="flashback-guess-label" id="flashback-guess-label">${indexToLabel(midIndex)}</p>
      <div class="flashback-slider-wrap">
        <input type="range" id="flashback-slider" class="flashback-slider" min="0" max="${FLASHBACK_MAX_INDEX}" value="${midIndex}" step="1">
        <div class="flashback-year-ticks" id="flashback-year-ticks"></div>
      </div>
      <button class="btn-flashback-confirm" id="flashback-confirm">Confirmar</button>
      <div id="flashback-feedback"></div>
    </div>`;

  renderFlashbackYearTicks();

  const slider = document.getElementById('flashback-slider');
  const label = document.getElementById('flashback-guess-label');
  slider.addEventListener('input', () => {
    label.textContent = indexToLabel(Number(slider.value));
  });

  document.getElementById('flashback-confirm').addEventListener('click', () => {
    answerFlashback(Number(slider.value), photo);
  });
}

function renderFlashbackYearTicks() {
  const ticksWrap = document.getElementById('flashback-year-ticks');
  const years = [];
  for (let y = FLASHBACK_START_YEAR; y <= FLASHBACK_END_YEAR; y++) years.push(y);
  ticksWrap.innerHTML = years.map(y => {
    const idx = monthYearToIndex(y, 1);
    if (idx > FLASHBACK_MAX_INDEX) return '';
    const pct = (idx / FLASHBACK_MAX_INDEX) * 100;
    return `<span class="flashback-year-tick" style="left:${pct}%">${y}</span>`;
  }).join('');
}

function answerFlashback(guessIndex, photo) {
  const correctIndex = monthYearToIndex(photo.year, photo.month);
  const distance = Math.abs(guessIndex - correctIndex);
  const earned = scoreForDistance(distance);
  flashbackTotalScore += earned;

  document.getElementById('flashback-slider').disabled = true;
  document.getElementById('flashback-confirm').remove();

  const feedback = document.getElementById('flashback-feedback');
  feedback.innerHTML = `
    <div class="flashback-feedback">
      <p class="real-date">Era ${indexToLabel(correctIndex)}</p>
      <p class="points-earned">${earned >= 0 ? '+' : ''}${earned} PochiCoins</p>
      <button class="trivia-next" id="flashback-next">${flashbackRoundIndex + 1 < flashbackRounds.length ? 'Siguiente ↪' : 'Ver resultado'}</button>
    </div>`;

  document.getElementById('flashback-next').addEventListener('click', () => {
    flashbackRoundIndex++;
    renderFlashbackRound();
  });
}

// ============ TE LO DIJE, BABY ============ 12
const QUOTES_PEOPLE = {
  a: { name: 'Leire', src: 'assets/quotes/leire.jpg' },
  b: { name: 'Sergio', src: 'assets/quotes/sergio.jpg' },
};

// "saidBy" debe ser "a" o "b" según quién la dijo.
const QUOTES_POOL = [
  { text: 'Mañana hablamos ... mi coshita prechiocha.', saidBy: 'a' },
  { text: 'Estás tú para hablar sobre copiar ... porque siempre me copias tú a mí.', saidBy: 'a' },
  { text: 'Duchar me ducho siempre, y depilar cuando toca, depende.', saidBy: 'b' },
  { text: '!Que no es ... imbecilingo/a', saidBy: 'a' },
  { text: '¿Quieres ser mi primer plato, mi segundo y mi postre?', saidBy: 'b' },
  { text: 'A mí me gusta f***ar a tope.', saidBy: 'a' },
  { text: 'Descansa, pechugote.', saidBy: 'b' },
  { text: 'A mí me apetece bizcocho de lotus con licor de lotus.', saidBy: 'b' },
  { text: 'Ou mama, sí que mando mensajes. Eso es que te quiero y tengo mucho que contarte.', saidBy: 'b' },
  { text: 'A qué tal ha dormido: Bienn, hasta había baba en la almohada.', saidBy: 'a' },
  { text: 'He visto esa p*** salchicha y creía que era tu pierna sangrando.', saidBy: 'a' },
  { text: 'Guatafaka mamelaka, qué me contaka!', saidBy: 'b' },
  { text: 'Qué guapo/a mi chico/a. No paro de verlo, sales genial sergiño/leiriña.', saidBy: 'a' },
  { text: '¿Dices que no hace falta (celebrar San Valentín) porque no estás enamorado/a de mí?', saidBy: 'b' },
  { text: 'Quiero soñar con el perro gordo de la felicidad, tú puedes aparecer de fondo.', saidBy: 'a' },
  { text: 'Me he quedado con ganas de hacer un poco de deporte cariñoso.', saidBy: 'a' },
  { text: 'No hay nada mejor que una buena cagada, eh.', saidBy: 'b' },
  { text: 'ERES MI GUAPO/A. ACUÉRDATE. O si no me enfado.', saidBy: 'a' },
  { text: 'Es que me quieres dejar de dramas y los dos sabemos que el/la dramas aquí eres tú.', saidBy: 'a' },
  { text: 'Ai papasito/mamasita lindo/a, cómo me calientas.', saidBy: 'b' },
  { text: 'A que la palabra pronto se parece a p*rno.', saidBy: 'a' },
  { text: 'En verdad tú tienes nombres más cariñosos conmigo.', saidBy: 'a' },
];

const QUOTES_PER_ROUND = 3;
const QUOTES_POINTS_PER_CORRECT = 4;
const QUOTES_PENALTY_WRONG = 2;
let currentQuotes = [];
let quotesIndex = 0;
let quotesCorrectCount = 0;
let quotesPoints = 0;

function startQuotes() {
  const saved = safeGet('pochiapp_session_quotes');
  if (saved) {
    currentQuotes = JSON.parse(saved);
  } else {
    currentQuotes = shuffle(QUOTES_POOL).slice(0, QUOTES_PER_ROUND);
    safeSet('pochiapp_session_quotes', JSON.stringify(currentQuotes));
  }
  quotesIndex = 0;
  quotesCorrectCount = 0;
  quotesPoints = 0;
  renderQuoteRound();
}

function personPhotoHTML(person) {
  if (person.src) return `<img src="${person.src}" alt="${person.name}">`;
  return person.name.charAt(0).toUpperCase();
}

function renderQuoteRound() {
  const wrap = document.getElementById('quotes-wrap');
  if (quotesIndex >= currentQuotes.length) {
    wrap.innerHTML = `
      <div class="quotes-summary">
        <p>Has acertado</p>
        <p class="big">${quotesCorrectCount} / ${currentQuotes.length}</p>
        <p>${quotesPoints >= 0 ? '+' : ''}${quotesPoints} PochiCoins ${quotesPoints >= 0 ? 'ganadas 🤩' : 'perdidas 😭'}</p>
      </div>`;
    addPoints(quotesPoints);
    setCooldownNow('quotes');
    safeRemove('pochiapp_session_quotes');
    updateGameHubState();
    return;
  }

  const item = currentQuotes[quotesIndex];
  wrap.innerHTML = `
    <div class="quotes-card">
      <p class="quotes-progress">Frase ${quotesIndex + 1} de ${currentQuotes.length}</p>
      <div class="quotes-bubble"><p class="quotes-text">"${item.text}"</p></div>
      <div class="quotes-people" id="quotes-people">
        <button class="quotes-person" data-who="a">
          <span class="quotes-photo">${personPhotoHTML(QUOTES_PEOPLE.a)}</span>
          <span class="quotes-name">${QUOTES_PEOPLE.a.name}</span>
        </button>
        <button class="quotes-person" data-who="b">
          <span class="quotes-photo">${personPhotoHTML(QUOTES_PEOPLE.b)}</span>
          <span class="quotes-name">${QUOTES_PEOPLE.b.name}</span>
        </button>
      </div>
    </div>`;

  document.querySelectorAll('#quotes-people .quotes-person').forEach(btn => {
    btn.addEventListener('click', () => answerQuote(btn.dataset.who));
  });
}

function answerQuote(selected) {
  const item = currentQuotes[quotesIndex];
  const buttons = document.querySelectorAll('#quotes-people .quotes-person');
  buttons.forEach(b => {
    b.disabled = true;
    if (b.dataset.who === item.saidBy) b.classList.add('correct');
    else if (b.dataset.who === selected) b.classList.add('incorrect');
  });

  if (selected === item.saidBy) {
    quotesCorrectCount++;
    quotesPoints += QUOTES_POINTS_PER_CORRECT;
  } else {
    quotesPoints -= QUOTES_PENALTY_WRONG;
  }

  const card = document.querySelector('.quotes-card');
  const nextBtn = document.createElement('button');
  nextBtn.className = 'quotes-next';
  nextBtn.textContent = (quotesIndex + 1 < currentQuotes.length) ? 'Siguiente ↪' : 'Ver resultado';
  nextBtn.addEventListener('click', () => {
    quotesIndex++;
    renderQuoteRound();
  });
  card.appendChild(nextBtn);
}

// ============ ¿WHAT U EATIN'? ============ 10
// "accepted" es una lista de respuestas válidas en minúsculas
const FOOD_PHOTOS = [
  { label: 'Foto 1', src: 'assets/eatin/e1.jpg', accepted: ['patata', 'patatas', 'patata frita', 'patatas fritas'] },
  { label: 'Foto 2', src: 'assets/eatin/e2.jpg', accepted: ['hamburguesa', 'hamburguesas', 'burger', 'burgers'] },
  { label: 'Foto 3', src: 'assets/eatin/e3.jpg', accepted: ['spaghettis', 'spaghetti', 'spaguetti', 'spaguettis', 'espagueti', 'espaguetis', 'espaguetti', 'espaguettis'] },
  { label: 'Foto 4', src: 'assets/eatin/e4.jpg', accepted: ['pizza', 'pizzas'] },
  { label: 'Foto 5', src: 'assets/eatin/e5.jpg', accepted: ['spaghettis', 'spaghetti', 'spaguetti', 'spaguettis', 'espagueti', 'espaguetis', 'espaguetti', 'espaguettis'] },
  { label: 'Foto 6', src: 'assets/eatin/e6.jpg', accepted: ['pepino', 'pepinos'] },
  { label: 'Foto 7', src: 'assets/eatin/e7.jpg', accepted: ['pepino', 'pepinos'] },
  { label: 'Foto 8', src: 'assets/eatin/e8.jpg', accepted: ['plátano', 'platano', 'platanos', 'plátanos', 'banana', 'bananas'] },
  { label: 'Foto 9', src: 'assets/eatin/e9.jpg', accepted: ['refrescos', 'refresco', 'soda', 'sodas', 'aquarius', 'mosto'] },
  { label: 'Foto 10', src: 'assets/eatin/e10.jpg', accepted: ['minipizzas', 'minipizza', 'panecillo', 'panecillos', 'mini pizza', 'mini pizzas'] },
  { label: 'Foto 11', src: 'assets/eatin/e11.jpg', accepted: ['bombón', 'bombon', 'bombones'] },
  { label: 'Foto 12', src: 'assets/eatin/e12.jpg', accepted: ['sandwich', 'bocadillos', 'bocata', 'bocatas', 'bocadillo', 'sandwiches', 'joe & the juice', 'joe and the juice'] },
  { label: 'Foto 13', src: 'assets/eatin/e13.jpg', accepted: ['sandwich', 'bocadillos', 'bocata', 'bocatas', 'bocadillo', 'sandwiches'] },
  { label: 'Foto 14', src: 'assets/eatin/e14.jpg', accepted: ['pizza', 'pizzas'] },
  { label: 'Foto 15', src: 'assets/eatin/e15.jpg', accepted: ['helado', 'helados', 'gelato', 'gelatos', 'tarrina', 'tarrinas'] },
  { label: 'Foto 16', src: 'assets/eatin/e16.jpg', accepted: ['helado', 'helados', 'helado de chocolate'] },
];

const FOOD_BLUR_STEPS = [22, 17, 13, 9, 3];
const FOOD_MAX_ATTEMPTS = 5;
let foodItem = null;
let foodAttempts = 0;
let foodOver = false;

function normalizeAnswer(str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function startFood() {
  const saved = safeGet('pochiapp_session_food');
  if (saved) {
    foodItem = JSON.parse(saved);
  } else {
    foodItem = FOOD_PHOTOS[Math.floor(Math.random() * FOOD_PHOTOS.length)];
    safeSet('pochiapp_session_food', JSON.stringify(foodItem));
  }
  foodAttempts = 0;
  foodOver = false;
  renderFood();
}

function foodPhotoHTML() {
  if (foodItem.src) return `<img src="${foodItem.src}" alt="comida">`;
  return `<span>${foodItem.label}</span>`;
}

function renderFood() {
  const wrap = document.getElementById('food-wrap');
  wrap.innerHTML = `
    <div class="food-card">
      <p class="food-attempts">Intento ${Math.min(foodAttempts + 1, FOOD_MAX_ATTEMPTS)} de ${FOOD_MAX_ATTEMPTS}</p>
      <div class="food-photo-wrap"><div class="food-photo" id="food-photo" style="filter: blur(${FOOD_BLUR_STEPS[foodAttempts]}px)">${foodPhotoHTML()}</div></div>
      <form class="food-form" id="food-form">
        <input type="text" id="food-input" class="food-input" placeholder="¿Qué es?" autocomplete="off">
        <button type="submit" class="btn-food-submit">Enviar</button>
      </form>
      <p id="food-feedback" class="food-feedback"></p>
    </div>`;

  document.getElementById('food-form').addEventListener('submit', (e) => {
    e.preventDefault();
    answerFood();
  });
}

function answerFood() {
  if (foodOver) return;
  const input = document.getElementById('food-input');
  const guess = normalizeAnswer(input.value);
  const feedback = document.getElementById('food-feedback');

  if (!guess) return;

  const isCorrect = foodItem.accepted.some(a => normalizeAnswer(a) === guess);

  if (isCorrect) {
    finishFood(true);
    return;
  }

  foodAttempts++;
  if (foodAttempts >= FOOD_MAX_ATTEMPTS) {
    finishFood(false);
    return;
  }

  document.getElementById('food-photo').style.filter = `blur(${FOOD_BLUR_STEPS[foodAttempts]}px)`;
  document.querySelector('.food-attempts').textContent = `Intento ${foodAttempts + 1} de ${FOOD_MAX_ATTEMPTS}`;
  feedback.textContent = 'Fríoo Fríoo...';
  feedback.className = 'food-feedback wrong';
  input.value = '';
  input.focus();
}


function finishFood(success) {
  foodOver = true;
  const earned = success ? Math.max(2, 10 - foodAttempts * 2) : 0;
  document.getElementById('food-photo').style.filter = 'blur(0px)';

  const wrap = document.getElementById('food-wrap');
  wrap.innerHTML = `
    <div class="food-summary">
      <p>${success ? "That's it baby!" : 'Noooo, perdiste 😭'}</p>
      <p class="big">Era: ${foodItem.accepted[0]}</p>
      <p>+🪙 ${earned} PochiCoins</p>
      <div class="food-photo-wrap"><div class="food-photo food-photo-clear">${foodPhotoHTML()}</div></div>
    </div>`;

  addPoints(earned);
  setCooldownNow('food');
  safeRemove('pochiapp_session_food');
  updateGameHubState();
}

// ============ ÁLBUM DE RECUERDOS ============
const ALBUM_PHOTOS = [
  { label: 'Foto 1', src: 'assets/album/a1.jpg', caption: 'La más nerdyy 🤓' },
  { label: 'Foto 2', src: 'assets/album/a2.jpg', caption: 'La más artística 💃' },
  { label: 'Foto 3', src: 'assets/album/a3.jpg', caption: 'La más mortal ☠️' },
  { label: 'Foto 4', src: 'assets/album/a4.jpg', caption: 'La más sobadota 😪' },
  { label: 'Foto 5', src: 'assets/album/a5.jpg', caption: 'La más girliee 🌺' },
  { label: 'Foto 6', src: 'assets/album/a6.jpg', caption: 'La más chucky 🔪' },
  { label: 'Foto 7', src: 'assets/album/a7.jpg', caption: 'La más real G 4 life 🥷' },
  { label: 'Foto 8', src: 'assets/album/a8.jpg', caption: 'La más tramposa 🤥' },
  { label: 'Foto 9', src: 'assets/album/a9.jpg', caption: 'La más pompoosa 😮‍💨' },
  { label: 'Foto 10', src: 'assets/album/a10.jpg', caption: 'La más peluchita 🧸' },
  { label: 'Foto 11', src: 'assets/album/a11.jpg', caption: 'La más WTF 😬' },
  { label: 'Foto 12', src: 'assets/album/a12.jpg', caption: 'La más elegante 👩‍🎓' },
  { label: 'Foto 13', src: 'assets/album/a13.jpg', caption: 'La más sexi girl 🥵' },
  { label: 'Foto 14', src: 'assets/album/a14.jpg', caption: 'La más n*gga 👨🏾‍🦲' },
  { label: 'Foto 15', src: 'assets/album/a15.jpg', caption: 'La más OUT OF BATTERY 🪫' },
  { label: 'Foto 16', src: 'assets/album/a16.jpg', caption: 'La más cocinillas 👩‍🍳' },
  { label: 'Foto 17', src: 'assets/album/a17.jpg', caption: 'La más saltimbanqui 👻' },
  { label: 'Foto 18', src: 'assets/album/a18.jpg', caption: 'La más cuatroojos 😎' },
  { label: 'Foto 19', src: 'assets/album/a19.jpg', caption: 'La más sleepy 😴' },
  { label: 'Foto 20', src: 'assets/album/a20.jpg', caption: 'La más girasolcillo 🌻' },
  { label: 'Foto 21', src: 'assets/album/a21.jpg', caption: 'La más princesona 👸' },
  { label: 'Foto 22', src: 'assets/album/a22.jpg', caption: 'La más maleabólica 👹' },
  { label: 'Foto 23', src: 'assets/album/a23.jpg', caption: 'La más escondidita 😶‍🌫️' },
  { label: 'Foto 24', src: 'assets/album/a24.jpg', caption: 'La más gangsterr 🥶' },
  { label: 'Foto 25', src: 'assets/album/a25.jpg', caption: 'La más locaaaa 🤪' },
  { label: 'Foto 26', src: 'assets/album/a26.jpg', caption: 'La más chupona mamona 👅' },
  { label: 'Foto 27', src: 'assets/album/a27.jpg', caption: 'De la que más orgulloso estoy 😇' },
  { label: 'Foto 28', src: 'assets/album/a28.jpg', caption: 'Los mejores ojitos 👀' },
  { label: 'Foto 29', src: 'assets/album/a29.jpg', caption: 'La más mona 🥰' },
  { label: 'Foto 30', src: 'assets/album/a30.jpg', caption: 'Mi favorita ❤️' },
];

// Reparto de fotos por página, a propósito irregular.
// La suma debe coincidir con el total de fotos en ALBUM_PHOTOS (30).
const ALBUM_PAGE_LAYOUT = [3, 2, 3, 2, 3, 3, 2, 3, 3, 3, 3];

let albumPage = 0;
const albumTotalPages = ALBUM_PAGE_LAYOUT.length;

const albumLayoutSum = ALBUM_PAGE_LAYOUT.reduce((a, b) => a + b, 0);
if (albumLayoutSum !== ALBUM_PHOTOS.length) {
  console.warn(`ALBUM_PAGE_LAYOUT suma ${albumLayoutSum} pero hay ${ALBUM_PHOTOS.length} fotos en ALBUM_PHOTOS. Revísalos si has añadido o quitado fotos.`);
}

// Índice de inicio (en ALBUM_PHOTOS) de cada página, a partir del reparto de arriba
function albumPageStart(pageIndex) {
  let start = 0;
  for (let i = 0; i < pageIndex; i++) start += ALBUM_PAGE_LAYOUT[i];
  return start;
}

function albumCardHTML(photo, globalIndex) {
  const photoFace = photo.src
    ? `<img src="${photo.src}" alt="${photo.label}">`
    : `<span>${photo.label}</span>`;
  return `
    <div class="album-card">
      <button class="flip-card" type="button" aria-label="Recuerdo ${globalIndex + 1}: toca para revelar la foto">
        <div class="flip-inner">
          <div class="flip-front">
            <div>
              <span class="flip-front-quote">❝</span>
              <p class="flip-front-caption">${photo.caption}</p>
            </div>
            <span class="flip-front-hint">📷</span>
          </div>
          <div class="flip-back">
            ${photoFace}
          </div>
        </div>
      </button>
    </div>`;
}

function renderAlbumPageContent() {
  const wrap = document.getElementById('album-page');
  if (!wrap) return;
  const start = albumPageStart(albumPage);
  const count = ALBUM_PAGE_LAYOUT[albumPage];
  const pagePhotos = ALBUM_PHOTOS.slice(start, start + count);

  wrap.innerHTML = pagePhotos.map((p, i) => albumCardHTML(p, start + i)).join('');
  wrap.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  });

  document.getElementById('album-indicator').textContent = `Página ${albumPage + 1} de ${albumTotalPages}`;
  document.getElementById('album-prev').disabled = albumPage === 0;
  document.getElementById('album-next').disabled = albumPage >= albumTotalPages - 1;
}

// Cambia de página con una pequeña animación de "hoja girando"
function goToAlbumPage(newPage, direction) {
  const wrap = document.getElementById('album-page');
  if (!wrap) return;
  wrap.classList.add(direction === 'next' ? 'page-turn-next' : 'page-turn-prev');
  setTimeout(() => {
    albumPage = newPage;
    renderAlbumPageContent();
    wrap.classList.remove('page-turn-next', 'page-turn-prev');
  }, 260);
}

const albumPrevBtn = document.getElementById('album-prev');
const albumNextBtn = document.getElementById('album-next');
if (albumPrevBtn) {
  albumPrevBtn.addEventListener('click', () => {
    if (albumPage > 0) goToAlbumPage(albumPage - 1, 'prev');
  });
}
if (albumNextBtn) {
  albumNextBtn.addEventListener('click', () => {
    if (albumPage < albumTotalPages - 1) goToAlbumPage(albumPage + 1, 'next');
  });
}

renderAlbumPageContent();

// ============ PREMIOS ============
const REWARDS = [
  { id: 'r1', title: 'Tu peli favorita 📺', desc: 'Vale por una noche de cine en casa. Leire elige y nadie se puede quejar. :)', cost: 100 },
  { id: 'r2', title: 'Cita de pintura 🖼️', desc: 'Pintamos dos cuadros y nos vamos turnando.', cost: 200 },
  { id: 'r3', title: 'Noche de cine 🎬', desc: 'Vamos al cine a ver la peli que elijas (con palomitass).', cost: 200 },
  { id: 'r4', title: 'Maquillar a Sergio 💄', desc: 'Me dejo hacer lo que sea, pero piensa un poco en mí ;(', cost: 250 },
  { id: 'r5', title: 'Un masaje relajante 🫧', desc: '30 minutos de masaje con velitas y todo.', cost: 250 },
  { id: 'r6', title: 'Un masaje premium ❤️‍🔥', desc: 'Sin descripción, ya tú sabe... ;)', cost: 350 },
  { id: 'r7', title: 'Desayuno en la cama 🥞', desc: 'Yo preparo tooodo. Un día de dormir juntos, obvio.', cost: 400 },
  { id: 'r8', title: 'Una cena romántica 🍷', desc: 'El restaurante que tú quierasss.', cost: 500 },
  { id: 'r9', title: 'El brunch perfecto 🍪', desc: 'Picnic en la costa con tu merienda ideall.', cost: 600 },
  { id: 'r10', title: 'Un menú completo 🥘', desc: 'El chef Sergieux Penaux le prepara entrante, principal y postre.', cost: 1000 },
  { id: 'r11', title: 'Escapada sorpresa 🚈', desc: 'Un plan fuera de Bilbao organizado por Sergis.', cost: 2500 },
];

function getRedeemed() {
  try { return JSON.parse(safeGet('pochiapp_redeemed') || '[]'); } catch (e) { return []; }
}

function saveRedeemed(list) {
  safeSet('pochiapp_redeemed', JSON.stringify(list));
}

function renderPremios() {
  const grid = document.getElementById('premios-grid');
  if (!grid) return;
  const redeemed = getRedeemed();
  const points = getPoints();

  grid.innerHTML = REWARDS.map(r => {
    const isDone = redeemed.includes(r.id);
    const canAfford = points >= r.cost;
    let btnLabel = isDone ? '✅ Reclamado' : 'Canjear 🫴';
    let btnClass = isDone ? 'btn-redeem is-done' : 'btn-redeem';
    let disabled = isDone || !canAfford;
    return `
      <div class="premio-card ${isDone ? 'redeemed' : ''}">
        <p class="premio-title">${r.title}</p>
        <p class="premio-desc">${r.desc}</p>
        <p class="premio-cost">🪙${r.cost}</p>
        <button class="${btnClass}" data-id="${r.id}" data-cost="${r.cost}" ${disabled ? 'disabled' : ''}>${btnLabel}</button>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-redeem').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cost = Number(btn.dataset.cost);
      const reward = REWARDS.find(r => r.id === id);
      showConfirm(`¿Canjear -"${reward.title}"- por 🪙${cost} PochiCoins?`, () => redeemReward(id, cost));
    });
  });
}

function redeemReward(id, cost) {
  const redeemed = getRedeemed();
  if (redeemed.includes(id)) return;
  if (getPoints() < cost) return;
  addPoints(-cost);
  redeemed.push(id);
  saveRedeemed(redeemed);
  renderPremios();
}

renderPremios();
