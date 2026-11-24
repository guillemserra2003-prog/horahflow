// Calculadora mini de los artículos del blog (la pinta build.mjs). Todo en el navegador: no se guarda ni se envía nada.
(function () {
  var eur = function (n) { return n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; };
  document.querySelectorAll('.mcalc').forEach(function (box) {
    var slug = box.dataset.slug || '';
    var btns = box.querySelectorAll('.mcalc-chips button');
    var m = box.querySelector('.mcalc-m'), y = box.querySelector('.mcalc-y');
    function total() {
      var t = 0;
      btns.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') t += parseFloat(b.dataset.p); });
      t = Math.round(t * 100) / 100;
      m.textContent = eur(t); y.textContent = eur(Math.round(t * 12 * 100) / 100);
      box.classList.toggle('has', t > 0);
    }
    btns.forEach(function (b) {
      // Si el artículo va de ese servicio (p. ej. cancelar-netflix), viene marcado
      if (slug.indexOf(b.dataset.k) >= 0) b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); total(); });
    });
    total();
  });
})();
