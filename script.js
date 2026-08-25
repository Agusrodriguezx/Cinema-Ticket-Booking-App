const movieCards = document.querySelectorAll(".movie-card");
const movieButtons = document.querySelectorAll(".movie-btn");

const modalOverlay = document.getElementById("modal-overlay");
const selectedMovieText = document.getElementById("selected-movie");

const confirmBtn = document.getElementById("confirm-btn");
const closeModal = document.getElementById("close-modal");

const successOverlay = document.getElementById("success-overlay");
const closeSuccess = document.getElementById("close-success");

const summary = document.getElementById("summary");

let selectedMovie = "";


// Seleccionar película desde el botón
movieButtons.forEach(button => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        selectedMovie = button.dataset.movie;

        selectedMovieText.textContent = selectedMovie;

        modalOverlay.classList.remove("hidden");

    });

});


// Seleccionar película haciendo click en el card
movieCards.forEach(card => {

    card.addEventListener("click", () => {

        selectedMovie =
            card.querySelector("h3").textContent;

        selectedMovieText.textContent =
            selectedMovie;

        modalOverlay.classList.remove("hidden");

    });

});


// Confirmar reserva
confirmBtn.addEventListener("click", () => {

    const schedule =
        document.getElementById("schedule").value;

    const tickets =
        document.getElementById("tickets").value;

    summary.innerHTML = `
        <strong>Película:</strong> ${selectedMovie}<br>
        <strong>Horario:</strong> ${schedule}<br>
        <strong>Entradas:</strong> ${tickets}
    `;

    modalOverlay.classList.add("hidden");

    successOverlay.classList.remove("hidden");

});


// Cerrar modal de reserva
closeModal.addEventListener("click", () => {

    modalOverlay.classList.add("hidden");

});


// Cerrar mensaje de éxito
closeSuccess.addEventListener("click", () => {

    successOverlay.classList.add("hidden");

});