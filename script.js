const form = document.getElementById("recipe-form");
const ingredientsEl = document.getElementById("ingredients");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const generateBtn = document.getElementById("generate-btn");

function renderEmpty(message = "Belum ada hasil. Coba generate resep!") {
  resultsEl.innerHTML = `<div class="card empty">${message}</div>`;
}
renderEmpty();

function dishCard(dish) {
  const {
    name,
    calories,
    estimatedTimeMinutes,
    ingredients = [],
    steps = [],
    macros = {}
  } = dish;
  const { protein_g = 0, carbs_g = 0, fat_g = 0 } = macros;

  return `
    <article class="card">
      <h3>${name}</h3>
      <div class="meta">~${calories} kkal • ${estimatedTimeMinutes} menit</div>
      <div class="badges">
        <span class="badge">Protein ${protein_g}g</span>
        <span class="badge">Karb ${carbs_g}g</span>
        <span class="badge">Lemak ${fat_g}g</span>
      </div>
      <strong>Bahan:</strong>
      <ul class="list">${ingredients.map((i) => `<li>${i}</li>`).join("")}</ul>
      <strong>Langkah:</strong>
      <ol class="list">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
    </article>
  `;
}

async function generateRecipes(ingredients) {
  statusEl.textContent = "Menghasilkan resep...";
  generateBtn.disabled = true;

  try {
    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients })
    });

    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || `Server error: ${resp.status}`);
    }

    const data = await resp.json();
    const dishes = Array.isArray(data?.dishes) ? data.dishes : [];

    if (!dishes.length) {
      renderEmpty("AI tidak mengembalikan resep. Coba ubah bahan.");
      return;
    }

    resultsEl.innerHTML = dishes.map(dishCard).join("");
    statusEl.textContent = "Selesai ✅";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    resultsEl.innerHTML = `<div class="card error">Terjadi kesalahan: ${err.message}</div>`;
  } finally {
    generateBtn.disabled = false;
    setTimeout(() => (statusEl.textContent = ""), 2000);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const ingredientsText = ingredientsEl.value.trim();
  if (!ingredientsText) {
    renderEmpty("Mohon isi bahan terlebih dahulu.");
    return;
  }
  generateRecipes(ingredientsText);
});
