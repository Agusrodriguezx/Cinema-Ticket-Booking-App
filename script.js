const movieCards = document.querySelectorAll(".movie-card");

const successOverlay =
  document.getElementById("success-overlay");

const closeSuccess =
  document.getElementById("close-success");

const modalOverlay =
  document.getElementById("modal-overlay");

const selectedMovieText =
  document.getElementById("selected-movie");

const confirmBtn =
  document.getElementById("confirm-btn");

const successSection =
  document.getElementById("success-section");

const summary =
  document.getElementById("summary");

let selectedMovie = "";

movieButtons.forEach(button => {

    button.addEventListener("click", () => {

        selectedMovie = button.dataset.movie;

        selectedMovieText.textContent = selectedMovie;

        modalOverlay.classList.remove("hidden");

        successSection.classList.add("hidden");
    });

});

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

document
  .getElementById("close-modal")
  .addEventListener("click", () => {
      modalOverlay.classList.add("hidden");
  });


closeSuccess.addEventListener("click", () => {

    successOverlay.classList.add("hidden");

});

movieCards.forEach(card => {

    card.addEventListener("click", () => {

        selectedMovie =
          card.querySelector("h3").textContent;

        selectedMovieText.textContent =
          selectedMovie;

        modalOverlay.classList.remove("hidden");
    });

});