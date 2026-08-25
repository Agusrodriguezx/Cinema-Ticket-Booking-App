const movieButtons = document.querySelectorAll(".movie-btn");

const reservationSection =
  document.getElementById("reservation-section");

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

        reservationSection.classList.remove("hidden");

        successSection.classList.add("hidden");
    });

});

confirmBtn.addEventListener("click", () => {

    const schedule =
      document.getElementById("schedule").value;

    const tickets =
      document.getElementById("tickets").value;

    summary.textContent =
      `Película: ${selectedMovie} | Horario: ${schedule} | Entradas: ${tickets}`;

    successSection.classList.remove("hidden");
});