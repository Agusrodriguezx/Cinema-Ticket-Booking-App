/* ---------- 1) Flujo de reserva ---------- */
(function () {
  'use strict';

  /* ---------- Configuración ---------- */
  var SEAT_ROWS = 'ABCDEFGH';  // A = más cerca de la pantalla
  var SEATS_PER_ROW = 10;      // pasillo después de la butaca 5
  var MAX_SEATS = 10;
  var TAKEN_RATIO = 0.22;      // % de butacas ocupadas (simulado)

  var SHOWS = [
    { id: 'es',  label: 'Español',      note: 'Doblada',     times: ['16:00', '18:30', '21:00'] },
    { id: 'sub', label: 'Subtituladas', note: 'Audio original', times: ['17:15', '19:45', '22:15'] }
  ];

  var TICKETS = [
    { id: 'general', name: 'Entrada general', desc: 'Precio regular', size: 1, price: 12000 },
    { id: 'mitad',   name: '50% OFF', desc: 'Válida lunes, martes y miércoles', size: 1, price: 6000, days: [1, 2, 3] },
    { id: '3x2',     name: 'Domingo 3x2', desc: 'Pack de 3 entradas pagando 2. Válida los domingos', size: 3, price: 24000, days: [0] },
    { id: 'felimas', name: 'Banco FeliMás 2x1', desc: 'Pack de 2 entradas al precio de 1. Pagando con tarjetas del Banco FeliMás', size: 2, price: 12000, card: 'Banco FeliMás' },
    { id: 'git',     name: 'Tarjeta Git 2x1', desc: 'Pack de 2 entradas al precio de 1. Pagando con Tarjeta Git', size: 2, price: 12000, card: 'Tarjeta Git' }
  ];

  var CANDY = [];
  function readCandy() {
    var groups = {}, order = [];
    document.querySelectorAll('.add-button').forEach(function (btn) {
      var card = btn.closest('.product-card'), cat = btn.closest('.candy-category');
      var catName = cat && cat.querySelector('.category-title') ? cat.querySelector('.category-title').textContent.trim() : 'Candy bar';
      var img = card && card.querySelector('img');
      if (!groups[catName]) { groups[catName] = []; order.push(catName); }
      groups[catName].push({ id: btn.dataset.name, name: btn.dataset.name, price: Number(btn.dataset.price), img: img ? img.src : '' });
    });
    CANDY = order.map(function (c) { return { cat: c, items: groups[c] }; });
  }
  function cartToCandy() { // arranca con lo que ya está en el carrito
    var o = {};
    if (typeof cart !== 'undefined') cart.forEach(function (i) { o[i.name] = i.quantity; });
    return o;
  }

  var STEP_NAMES = ['Función', 'Butacas', 'Entradas', 'Candy bar', 'Pago'];
  var DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ---------- Utilidades ---------- */
  var fmt = function (n) { return '$' + n.toLocaleString('es-AR'); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function seeded(seed) { // generador pseudoaleatorio determinista
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  }
  function buildDays() {
    var out = [], base = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12);
      out.push({ dow: d.getDay(), label: i === 0 ? 'Hoy' : DAY_NAMES[d.getDay()].slice(0, 3),
                 date: d.getDate() + ' ' + MONTHS[d.getMonth()], full: DAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] });
    }
    return out;
  }

  /* ---------- Estado ---------- */
  var S, days, root;

  function freshState(movie) {
    return { movie: movie, step: 1, maxStep: 1, day: 0, show: null, seats: [], tickets: {}, candy: cartToCandy(),
             form: { nombre: '', apellido: '', email: '' }, pay: '', cardOk: {}, done: null };
  }
  function taken() {
    if (!S.show) return {};
    var rnd = seeded(S.movie + '|' + S.day + '|' + S.show.id + '|' + S.show.time), t = {};
    for (var r = 0; r < SEAT_ROWS.length; r++)
      for (var c = 1; c <= SEATS_PER_ROW; c++) if (rnd() < TAKEN_RATIO) t[SEAT_ROWS[r] + c] = true;
    return t;
  }
  function ticketAvailable(t) { return !t.days || t.days.indexOf(days[S.day].dow) !== -1; }
  function covered() {
    return TICKETS.reduce(function (n, t) { return n + (S.tickets[t.id] || 0) * t.size; }, 0);
  }
  function ticketsTotal() {
    return TICKETS.reduce(function (n, t) { return n + (S.tickets[t.id] || 0) * t.price; }, 0);
  }
  function candyTotal() {
    var n = 0;
    CANDY.forEach(function (g) { g.items.forEach(function (i) { n += (S.candy[i.id] || 0) * i.price; }); });
    return n;
  }
  function total() { return ticketsTotal() + candyTotal(); }
  function cardPromos() { return TICKETS.filter(function (t) { return t.card && S.tickets[t.id]; }); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function canNext() {
    if (S.step === 1) return !!S.show;
    if (S.step === 2) return S.seats.length > 0;
    if (S.step === 3) return covered() === S.seats.length;
    if (S.step === 4) return true;
    var f = S.form;
    if (!f.nombre.trim() || !f.apellido.trim() || !emailOk(f.email.trim()) || !S.pay) return false;
    return cardPromos().every(function (t) { return S.cardOk[t.id]; });
  }

  /* ---------- Render de cada paso ---------- */
  function stepDay() {
    var h = '<h3 class="cpb-h">Elegí una función</h3><p class="cpb-sub">Seleccioná el día y el horario. Las funciones están en español o subtituladas.</p>';
    h += '<div class="cpb-days">' + days.map(function (d, i) {
      return '<button type="button" class="cpb-chip' + (i === S.day ? ' cpb-on' : '') + '" data-a="day" data-i="' + i + '">' + d.label + '<small>' + d.date + '</small></button>';
    }).join('') + '</div>';
    SHOWS.forEach(function (sh) {
      h += '<div class="cpb-lang"><div class="cpb-lang-name">' + sh.label + '<small>' + sh.note + '</small></div><div class="cpb-times">' +
        sh.times.map(function (t) {
          var on = S.show && S.show.id === sh.id && S.show.time === t;
          return '<button type="button" class="cpb-chip cpb-time' + (on ? ' cpb-on' : '') + '" data-a="show" data-id="' + sh.id + '" data-t="' + t + '">' + t + '</button>';
        }).join('') + '</div></div>';
    });
    return h;
  }

  function stepSeats() {
    var tk = taken();
    var h = '<h3 class="cpb-h">Elegí tus butacas</h3><p class="cpb-sub">Podés elegir hasta ' + MAX_SEATS + '. La cantidad de entradas se calcula según las butacas que marques.</p>';
    h += '<div class="cpb-seatmap"><div class="cpb-screen">Pantalla</div><div class="cpb-glow"></div>';
    h += '<div class="cpb-depth"><span>Cerca de la pantalla</span></div>';
    for (var r = 0; r < SEAT_ROWS.length; r++) {
      h += '<div class="cpb-row"><span class="cpb-row-label">' + SEAT_ROWS[r] + '</span>';
      for (var c = 1; c <= SEATS_PER_ROW; c++) {
        var id = SEAT_ROWS[r] + c, sel = S.seats.indexOf(id) !== -1;
        h += '<button type="button" class="cpb-seat' + (sel ? ' cpb-sel' : '') + '" data-a="seat" data-id="' + id + '"' +
             (tk[id] ? ' disabled' : '') + ' aria-pressed="' + sel + '" aria-label="Butaca ' + id + (tk[id] ? ', ocupada' : '') + '">' + c + '</button>';
        if (c === SEATS_PER_ROW / 2) h += '<span class="cpb-aisle"></span>';
      }
      h += '<span class="cpb-row-label">' + SEAT_ROWS[r] + '</span></div>';
    }
    h += '<div class="cpb-depth"><span>Lejos de la pantalla</span></div></div>';
    h += '<div class="cpb-legend"><span><i></i>Libre</span><span><i class="cpb-l-sel"></i>Elegida</span><span><i class="cpb-l-taken"></i>Ocupada</span></div>';
    h += '<p class="cpb-picked" id="cpb-picked">' + pickedText() + '</p>';
    return h;
  }
  function pickedText() {
    if (!S.seats.length) return '<span style="color:var(--cpb-muted)">Todavía no elegiste butacas.</span>';
    var n = S.seats.length;
    return '<strong>' + S.seats.slice().sort(seatSort).join(', ') + '</strong> · ' + n + (n === 1 ? ' entrada' : ' entradas');
  }
  function seatSort(a, b) { return a[0] === b[0] ? parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10) : a.charCodeAt(0) - b.charCodeAt(0); }

  function stepTickets() {
    var n = S.seats.length;
    var h = '<h3 class="cpb-h">Elegí tus entradas</h3><p class="cpb-sub">Tenés ' + n + (n === 1 ? ' butaca' : ' butacas') + '. Asigná un tipo de entrada a cada una.</p><div class="cpb-list">';
    TICKETS.forEach(function (t) {
      var ok = ticketAvailable(t), q = S.tickets[t.id] || 0, canAdd = ok && covered() + t.size <= n;
      h += '<div class="cpb-item' + (ok ? '' : ' cpb-off') + '"><div class="cpb-item-info"><div class="cpb-item-name">' + t.name + '</div>' +
           '<div class="cpb-item-desc">' + t.desc + (ok ? '' : ' (no disponible para el día elegido)') + '</div>' +
           '<div class="cpb-item-price">' + fmt(t.price) + (t.size > 1 ? ' por pack' : ' c/u') + '</div></div>' +
           '<div class="cpb-qty"><button type="button" data-a="tk-" data-id="' + t.id + '"' + (q ? '' : ' disabled') + ' aria-label="Quitar">−</button>' +
           '<span>' + q + '</span><button type="button" data-a="tk+" data-id="' + t.id + '"' + (canAdd ? '' : ' disabled') + ' aria-label="Agregar">+</button></div></div>';
    });
    h += '</div><p class="cpb-status" id="cpb-status">' + ticketStatus() + '</p>';
    return h;
  }
  function ticketStatus() {
    var left = S.seats.length - covered();
    return left === 0 ? 'Todas las entradas están asignadas.' :
      '<span class="cpb-warn">Te ' + (left === 1 ? 'falta 1 entrada' : 'faltan ' + left + ' entradas') + ' por asignar.</span>';
  }

  function stepCandy() {
    var h = '<h3 class="cpb-h">Candy bar</h3><p class="cpb-sub">Sumá lo que quieras. Es opcional: podés continuar sin agregar nada.</p>';
    CANDY.forEach(function (g) {
      h += '<h4 class="cpb-cat">' + g.cat + '</h4><div class="cpb-list">';
      g.items.forEach(function (i) {
        var q = S.candy[i.id] || 0;
        h += '<div class="cpb-item">' + (i.img ? '<img src="' + esc(i.img) + '" alt="" loading="lazy">' : '') + '<div class="cpb-item-info"><div class="cpb-item-name">' + esc(i.name) +
             '</div><div class="cpb-item-price">' + fmt(i.price) + '</div></div><div class="cpb-qty">' +
             '<button type="button" data-a="cd-" data-id="' + esc(i.id) + '"' + (q ? '' : ' disabled') + ' aria-label="Quitar">−</button><span>' + q +
             '</span><button type="button" data-a="cd+" data-id="' + esc(i.id) + '" aria-label="Agregar">+</button></div></div>';
      });
      h += '</div>';
    });
    return h;
  }

  function summaryHTML() {
    var h = '<div class="cpb-summary"><div><span class="cpb-muted">Película</span><span>' + esc(S.movie) + '</span></div>' +
      '<div><span class="cpb-muted">Función</span><span>' + days[S.day].full + ', ' + S.show.time + ' · ' + S.show.label + '</span></div>' +
      '<div><span class="cpb-muted">Butacas</span><span>' + S.seats.slice().sort(seatSort).join(', ') + '</span></div>';
    TICKETS.forEach(function (t) { if (S.tickets[t.id]) h += '<div><span>' + S.tickets[t.id] + ' × ' + t.name + '</span><span>' + fmt(S.tickets[t.id] * t.price) + '</span></div>'; });
    CANDY.forEach(function (g) { g.items.forEach(function (i) { if (S.candy[i.id]) h += '<div><span>' + S.candy[i.id] + ' × ' + esc(i.name) + '</span><span>' + fmt(S.candy[i.id] * i.price) + '</span></div>'; }); });
    return h + '<div><strong>Total</strong><strong>' + fmt(total()) + '</strong></div></div>';
  }

  function stepPay() {
    var f = S.form;
    var h = '<h3 class="cpb-h">Tus datos y método de pago</h3><p class="cpb-sub">Te enviaremos las entradas al correo electrónico.</p>' +
      '<div class="cpb-form">' +
      '<label class="cpb-field">Nombre<input type="text" data-f="nombre" autocomplete="given-name" value="' + esc(f.nombre) + '"></label>' +
      '<label class="cpb-field">Apellido<input type="text" data-f="apellido" autocomplete="family-name" value="' + esc(f.apellido) + '"></label>' +
      '<label class="cpb-field cpb-full">Correo electrónico<input type="email" data-f="email" autocomplete="email" value="' + esc(f.email) + '"></label></div>' +
      '<h4 class="cpb-cat">Método de pago</h4><div class="cpb-pay">' +
      ['Tarjeta de débito', 'Tarjeta de crédito'].map(function (m) {
        return '<button type="button" data-a="pay" data-m="' + m + '" class="' + (S.pay === m ? 'cpb-on' : '') + '" aria-pressed="' + (S.pay === m) + '">' + m + '</button>';
      }).join('') + '</div>';
    cardPromos().forEach(function (t) {
      h += '<label class="cpb-check"><input type="checkbox" data-a="cardok" data-id="' + t.id + '"' + (S.cardOk[t.id] ? ' checked' : '') + '> Confirmo que voy a pagar con ' + t.card + ' (requerido por la promo ' + t.name + ').</label>';
    });
    return h + summaryHTML();
  }

  function successView() {
    return '<div class="cpb-success"><div class="cpb-tick">✓</div><h3 class="cpb-h">¡Reserva realizada con éxito!</h3>' +
      '<p class="cpb-sub">Enviamos el detalle a ' + esc(S.form.email) + '. Gracias por elegir CinePlus.</p>' +
      '<div class="cpb-code">Código: ' + S.done + '</div>' + summaryHTML() + '</div>';
  }

  /* ---------- Marco del modal ---------- */
  function build() {
    root = document.createElement('div');
    root.className = 'cpb-overlay';
    root.innerHTML = '<div class="cpb-modal" role="dialog" aria-modal="true" aria-labelledby="cpb-title">' +
      '<div class="cpb-head"><div class="cpb-title-row"><h2 class="cpb-title" id="cpb-title"></h2>' +
      '<button type="button" class="cpb-close" data-a="close" aria-label="Cerrar">✕</button></div><ol class="cpb-steps" id="cpb-steps"></ol></div>' +
      '<div class="cpb-body" id="cpb-body"></div>' +
      '<div class="cpb-foot"><div class="cpb-total" id="cpb-total"></div><div class="cpb-actions" id="cpb-actions"></div></div></div>';
    document.body.appendChild(root);

    root.addEventListener('click', onClick);
    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-f');
      if (k) { S.form[k] = e.target.value; renderFooter(); }
    });
    root.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-a') === 'cardok') { S.cardOk[e.target.getAttribute('data-id')] = e.target.checked; renderFooter(); }
    });
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('cpb-open')) close(); });
  }

  function renderHead() {
    root.querySelector('#cpb-title').textContent = S.movie;
    root.querySelector('#cpb-steps').innerHTML = STEP_NAMES.map(function (n, i) {
      var k = i + 1, cls = k === S.step ? 'cpb-current' : (k < S.step ? 'cpb-done' : '');
      return '<li><button type="button" class="cpb-step-btn ' + cls + '" data-a="goto" data-s="' + k + '"' +
        ((S.done || k > S.maxStep) ? ' disabled' : '') + (k === S.step ? ' aria-current="step"' : '') + '><span>' + k + '. ' + n + '</span></button></li>';
    }).join('');
  }
  function renderBody() {
    var b = root.querySelector('#cpb-body');
    b.innerHTML = S.done ? successView() : [null, stepDay, stepSeats, stepTickets, stepCandy, stepPay][S.step]();
    b.scrollTop = 0;
  }
  function renderFooter() {
    var t = root.querySelector('#cpb-total'), a = root.querySelector('#cpb-actions');
    if (S.done) { t.innerHTML = ''; a.innerHTML = '<button type="button" class="cpb-btn cpb-primary" data-a="close">Cerrar</button>'; return; }
    t.innerHTML = S.step >= 3 || total() ? 'Total<strong>' + fmt(total()) + '</strong>' : '';
    a.innerHTML = (S.step > 1 ? '<button type="button" class="cpb-btn" data-a="back">Atrás</button>' : '') +
      '<button type="button" class="cpb-btn cpb-primary" data-a="next"' + (canNext() ? '' : ' disabled') + '>' + (S.step === 5 ? 'Confirmar reserva' : 'Continuar') + '</button>';
  }
  function render() { renderHead(); renderBody(); renderFooter(); }

  /* ---------- Acciones ---------- */
  function go(step) {
    if (step === 3 && covered() !== S.seats.length) S.tickets = { general: S.seats.length }; // por defecto: todas generales
    S.step = step; S.maxStep = Math.max(S.maxStep, step); render();
  }
  function onClick(e) {
    var el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
    var a = el.getAttribute('data-a'), id = el.getAttribute('data-id');
    if (a === 'close') return close();
    if (a === 'cardok') return; // se maneja en "change"
    if (a === 'goto') return go(+el.getAttribute('data-s'));
    if (a === 'back') return go(S.step - 1);
    if (a === 'next') {
      if (!canNext()) return;
      if (S.step === 5) return confirmar();
      return go(S.step + 1);
    }
    if (a === 'day') { S.day = +el.getAttribute('data-i'); S.show = null; S.seats = []; S.tickets = {}; S.maxStep = 1; return render(); }
    if (a === 'show') {
      var sh = SHOWS.filter(function (x) { return x.id === id; })[0];
      S.show = { id: sh.id, label: sh.label, time: el.getAttribute('data-t') }; S.seats = []; S.tickets = {}; S.maxStep = 1; return render();
    }
    if (a === 'seat') {
      var i = S.seats.indexOf(id);
      if (i === -1) { if (S.seats.length >= MAX_SEATS) return; S.seats.push(id); } else S.seats.splice(i, 1);
      S.tickets = {}; S.maxStep = 2;
      el.classList.toggle('cpb-sel', i === -1); el.setAttribute('aria-pressed', i === -1);
      root.querySelector('#cpb-picked').innerHTML = pickedText();
      return renderFooter();
    }
    if (a === 'tk+' || a === 'tk-') {
      var t = TICKETS.filter(function (x) { return x.id === id; })[0];
      S.tickets[id] = Math.max(0, (S.tickets[id] || 0) + (a === 'tk+' ? 1 : -1));
      if (!S.tickets[id]) { delete S.tickets[id]; delete S.cardOk[id]; }
      S.maxStep = Math.min(S.maxStep, 3); return render();
    }
    if (a === 'cd+' || a === 'cd-') {
      S.candy[id] = Math.max(0, (S.candy[id] || 0) + (a === 'cd+' ? 1 : -1));
      if (!S.candy[id]) delete S.candy[id];
      return render();
    }
    if (a === 'pay') { S.pay = el.getAttribute('data-m'); return render(); }
  }

  function confirmar() {
    S.done = 'CP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    var order = { code: S.done, movie: S.movie, day: days[S.day].full, time: S.show.time, language: S.show.label,
      seats: S.seats.slice().sort(seatSort), tickets: JSON.parse(JSON.stringify(S.tickets)), candy: JSON.parse(JSON.stringify(S.candy)),
      customer: { nombre: S.form.nombre.trim(), apellido: S.form.apellido.trim(), email: S.form.email.trim() },
      paymentMethod: S.pay, total: total() };
    // Enganchate acá para guardar la reserva (fetch a tu backend, localStorage, etc.)
    document.dispatchEvent(new CustomEvent('cineplus:booking', { detail: order }));
    if (typeof cart !== 'undefined') { cart.length = 0; saveCart(); renderCart(); } // lo del candy bar ya se compró
    render();
  }

  function open(movie) {
    if (!root) build();
    days = buildDays();
    readCandy();
    S = freshState(movie || 'Película');
    render();
    root.classList.add('cpb-open');
    document.body.classList.add('cpb-lock');
    var f = root.querySelector('.cpb-chip.cpb-on') || root.querySelector('.cpb-chip'); if (f) f.focus();
  }
  function close() {
    if (!root) return;
    root.classList.remove('cpb-open');
    document.body.classList.remove('cpb-lock');
  }

  /* ---------- Click en las tarjetas de la cartelera ---------- */
  document.querySelectorAll('.movie-card').forEach(function (card) {
    card.addEventListener('click', function () { open(card.querySelector('h3').textContent.trim()); });
  });

  window.CinePlusBooking = { open: open, close: close };
})();

/* ---------- 2) Carrito del Candy Bar ---------- */

const CART_STORAGE_KEY = 'cineplus-cart';
let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
const cartOverlay = document.getElementById('cart-overlay');
const cartItems = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const toast = document.getElementById('toast');
let toastTimer;

document.getElementById('open-cart').addEventListener('click', () => cartOverlay.classList.add('open'));
document.getElementById('close-cart').addEventListener('click', () => cartOverlay.classList.remove('open'));
cartOverlay.addEventListener('click', (event) => {
    if (event.target === cartOverlay) cartOverlay.classList.remove('open');
});

document.querySelectorAll('.add-button').forEach((button) => {
    button.addEventListener('click', () => {
        const name = button.dataset.name;
        const price = Number(button.dataset.price);
        const existing = cart.find((item) => item.name === name);
        if (existing) existing.quantity += 1;
        else cart.push({ name, price, quantity: 1 });
        saveCart();
        renderCart();
        showToast(`${name} agregado al carrito`);
        cartOverlay.classList.add('open');
    });
});

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function renderCart() {
    if (!cart.length) {
        cartItems.innerHTML = '<p class="empty-cart">Tu carrito está vacío.<br>Agregá productos del Candy Bar.</p>';
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div>
                    <h3>${item.name}</h3>
                    <p>${formatPrice(item.price * item.quantity)}</p>
                </div>
                <div class="cart-controls">
                    <button class="quantity-button" type="button" onclick="changeQuantity(${index}, -1)">−</button>
                    <strong>${item.quantity}</strong>
                    <button class="quantity-button" type="button" onclick="changeQuantity(${index}, 1)">+</button>
                    <button class="remove-button" type="button" onclick="removeItem(${index})">×</button>
                </div>
            </div>`).join('');
    }
    cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    cartTotal.textContent = formatPrice(cart.reduce((total, item) => total + item.price * item.quantity, 0));
}

window.changeQuantity = (index, amount) => {
    cart[index].quantity += amount;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    renderCart();
};

window.removeItem = (index) => {
    cart.splice(index, 1);
    saveCart();
    renderCart();
};

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatPrice(value) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

renderCart();
