/* Article pages: the old shop's buy buttons and forms point at the live store, since checkout lives there. */
(function () {
  document.querySelectorAll("button").forEach(function (b) {
    if (/get ray|add to|buy|order|checkout/i.test(b.textContent) && !b.closest(".nav")) {
      b.addEventListener("click", function () { location.href = "https://getchargerless.com/shop"; });
    }
  });
})();

(function () {
  document.querySelectorAll(".options[data-for]").forEach(function (g) {
    var card = g.closest(".product-card"), img = card && card.querySelector(".product-photo img"), size = card && card.querySelector("select");
    g.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () {
      g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (img && b.dataset.img) img.src = "assets/img/" + b.dataset.img;
      if (size) { size.disabled = b.dataset.band === "silicone"; size.innerHTML = size.disabled ? "<option>One size</option>" : "<option>Small / Medium</option><option>Medium / Large</option>"; }
    }); });
  });
})();
