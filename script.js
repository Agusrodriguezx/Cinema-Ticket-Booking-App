const movieCards = document.querySelectorAll('.movie-card');
const movieButtons = document.querySelectorAll('.movie-btn');
const modalOverlay = document.getElementById('modal-overlay');
const selectedMovieText = document.getElementById('selected-movie');
const confirmBtn = document.getElementById('confirm-btn');
const closeModal = document.getElementById('close-modal');
const successOverlay = document.getElementById('success-overlay');
const closeSuccess = document.getElementById('close-success');
const summary = document.getElementById('summary');
let selectedMovie = '';

movieButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        selectedMovie = button.dataset.movie;
        selectedMovieText.textContent = selectedMovie;
        modalOverlay.classList.remove('hidden');
    });
});

movieCards.forEach((card) => {
    card.addEventListener('click', () => {
        selectedMovie = card.querySelector('h3').textContent;
        selectedMovieText.textContent = selectedMovie;
        modalOverlay.classList.remove('hidden');
    });
});

confirmBtn.addEventListener('click', () => {
    const schedule = document.getElementById('schedule').value;
    const tickets = document.getElementById('tickets').value;
    summary.innerHTML = `<strong>Película:</strong> ${selectedMovie}<br><strong>Horario:</strong> ${schedule}<br><strong>Entradas:</strong> ${tickets}`;
    modalOverlay.classList.add('hidden');
    successOverlay.classList.remove('hidden');
});

closeModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));
closeSuccess.addEventListener('click', () => successOverlay.classList.add('hidden'));

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
        cartItems.innerHTML = cart.map((item, index) => `<div class="cart-item"><div><h3>${item.name}</h3><p>${formatPrice(item.price * item.quantity)}</p></div><div class="cart-controls"><button class="quantity-button" type="button" onclick="changeQuantity(${index}, -1)">−</button><strong>${item.quantity}</strong><button class="quantity-button" type="button" onclick="changeQuantity(${index}, 1)">+</button><button class="remove-button" type="button" onclick="removeItem(${index})">×</button></div></div>`).join('');
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
