/* Page behaviour that doesn't need WebGL: smooth scroll, nav, entrances, the minute grid, the configurator state. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // smooth scroll (Lenis), driven by GSAP's ticker so ScrollTrigger stays in step
  var lenis = null;
  if (!reduce && window.Lenis && window.gsap) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis");
  } else if (window.gsap) gsap.registerPlugin(ScrollTrigger);
  // layout settles after load (lazy images, fonts, the 3D canvas), so re-measure every scroll trigger when it does
  if (window.ScrollTrigger) {
    var rT = null, refresh = function () { clearTimeout(rT); rT = setTimeout(function () { ScrollTrigger.refresh(); }, 150); };
    addEventListener("load", refresh);
    document.querySelectorAll("img").forEach(function (im) { if (!im.complete) im.addEventListener("load", refresh, { once: true }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    new MutationObserver(function (ms) { if (ms.some(function (m) { return m.attributeName === "class" && /model-ready|no3d/.test(document.body.className); })) refresh(); }).observe(document.body, { attributes: true });
  }
  window.CL = window.CL || {};
  CL.lenis = lenis;
  CL.scrollTo = function (sel) { var el = document.querySelector(sel); if (!el) return; if (lenis) lenis.scrollTo(el, { offset: -72 }); else el.scrollIntoView({ behavior: "smooth" }); };
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute("href") === "#") return;
    e.preventDefault(); CL.scrollTo(a.getAttribute("href")); closeSheet();
  });

  // nav: solid after the hero; phone sheet
  var nav = document.getElementById("nav"), buybar = document.getElementById("buybar"), hero = document.querySelector(".hero");
  function onScroll() {
    var y = window.scrollY; nav.classList.toggle("solid", y > 24);
    var past = hero ? y > hero.offsetHeight - 120 : y > 600, cfg = document.getElementById("configure");
    var inCfg = cfg && y + innerHeight > cfg.offsetTop + 200 && y < cfg.offsetTop + cfg.offsetHeight - 200;
    if (buybar) buybar.classList.toggle("show", past && !inCfg);
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var sheet = document.getElementById("sheet"), menu = document.querySelector(".menu");
  if (!sheet || !menu) { sheet = sheet || { classList: { remove() {}, toggle() {}, contains() { return false; } }, querySelector() { return { addEventListener() {} }; } }; menu = menu || { setAttribute() {}, addEventListener() {} }; }
  function closeSheet() { sheet.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); if (lenis) lenis.start(); }
  menu.addEventListener("click", function () { var open = !sheet.classList.contains("open"); sheet.classList.toggle("open", open); menu.setAttribute("aria-expanded", String(open)); if (lenis) open ? lenis.stop() : lenis.start(); });
  sheet.querySelector(".x").addEventListener("click", closeSheet);

  // headlines arrive word by word; everything else rises in
  if (!reduce) document.querySelectorAll("h1.rv, h2.rv").forEach(function (h) {
    if (h.querySelector("em, br") || h.closest(".panel")) return;   // keep the ones with markup as they are
    var words = h.textContent.trim().split(/\s+/);
    h.innerHTML = words.map(function (w) { return '<span class="w"><span>' + w + "</span></span>"; }).join(" ");
    h.classList.add("words");
  });
  // the big numbers count up when they come into view
  function countUp(el) {
    var txt = el.textContent, m = txt.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/); if (!m || reduce) return;
    var end = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length, t0 = null;
    function step(ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 1400); k = 1 - Math.pow(1 - k, 3);
      var v = (end * k).toFixed(dec); if (end >= 1000) v = Number(v).toLocaleString("en-US"); el.textContent = m[1] + v + m[3]; if (k < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var seenCount = new WeakSet();
  // entrances
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".rv, #bars").forEach(function (el) { io.observe(el); });
  var cio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !seenCount.has(e.target)) { seenCount.add(e.target); countUp(e.target); cio.unobserve(e.target); } }); }, { threshold: 0.6 });
  document.querySelectorAll(".stats b, .tri b").forEach(function (el) { cio.observe(el); });

  // nav tucks away as you scroll down and comes back as soon as you scroll up
  var lastY = 0;
  addEventListener("scroll", function () { var y = scrollY; if (!sheet.classList.contains("open")) nav.classList.toggle("hide", y > lastY && y > 320); lastY = y; }, { passive: true });

  // buttons lean toward the pointer a little (desktop only)
  if (!reduce && matchMedia("(hover:hover)").matches) document.querySelectorAll(".btn").forEach(function (b) {
    b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3) + "px)"; });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });

  // photos inside cards drift slower than the page (a little parallax)
  if (!reduce && window.gsap) document.querySelectorAll(".card img, .bleed img, .pair img, .lightness img, .batch > .wrap > img").forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 0.6 } });
  });

  // FAQ answers open smoothly
  document.querySelectorAll(".faq details").forEach(function (d) {
    var a = d.querySelector(".a"); if (!a) return;
    d.querySelector("summary").addEventListener("click", function (e) {
      e.preventDefault();
      if (d.open) { var h = a.offsetHeight; a.style.height = h + "px"; requestAnimationFrame(function () { a.style.height = "0px"; }); a.addEventListener("transitionend", function f() { d.open = false; a.style.height = ""; a.removeEventListener("transitionend", f); }); }
      else { d.open = true; var h2 = a.scrollHeight; a.style.height = "0px"; requestAnimationFrame(function () { a.style.height = h2 + "px"; }); a.addEventListener("transitionend", function g() { a.style.height = ""; a.removeEventListener("transitionend", g); }); }
    });
  });

  // the minute grid: 24 rows of 60 marks, the one lit mark is the minute of sun
  var rows = document.getElementById("dayl-rows");
  if (rows) {
    var labels = { 0: "12 am", 6: "6 am", 12: "12 pm", 18: "6 pm" }, html = "";
    for (var h = 0; h < 24; h++) {
      html += '<div class="row"><em>' + (labels[h] || "") + '</em><div class="ticks">';
      for (var m = 0; m < 60; m++) html += '<i' + (h === 12 && m === 30 ? ' class="sun"' : "") + "></i>";
      html += "</div></div>";
    }
    rows.innerHTML = html;
    if (!reduce && window.gsap) {
      ScrollTrigger.create({ trigger: rows, start: "top 75%", once: true, onEnter: function () {
        gsap.from(rows.querySelectorAll(".ticks i"), { scaleX: 0, duration: 0.6, ease: "power2.out", stagger: { each: 0.0006, from: "start" } });
        gsap.fromTo(rows.querySelector(".sun"), { scale: 1 }, { scale: 1.6, yoyo: true, repeat: 3, duration: 0.5, delay: 0.9, ease: "sine.inOut" });
      } });
    }
  }

  // the iPhone mockups: drift at two speeds with the scroll, tilt toward the pointer on desktop
  var phones = document.getElementById("phones");
  if (phones && window.gsap && !reduce) {
    phones.querySelectorAll(".iphone").forEach(function (ph) {
      gsap.to(ph, { yPercent: parseFloat(ph.dataset.speed) * 100, ease: "none", scrollTrigger: { trigger: phones, start: "top bottom", end: "bottom top", scrub: 0.8 } });
    });
    if (matchMedia("(hover:hover)").matches) {
      var tilt = { x: 0, y: 0 };
      phones.addEventListener("pointermove", function (e) { var r = phones.getBoundingClientRect(); tilt.x = ((e.clientX - r.left) / r.width - 0.5) * 2; tilt.y = ((e.clientY - r.top) / r.height - 0.5) * 2; apply(); });
      phones.addEventListener("pointerleave", function () { tilt.x = 0; tilt.y = 0; apply(); });
      function apply() { phones.querySelectorAll(".iphone").forEach(function (ph, i) { var k = i ? -1 : 1; ph.style.transform = "rotateY(" + (tilt.x * 9 * k) + "deg) rotateX(" + (-tilt.y * 7) + "deg)"; }); }
    }
  }

  // configurator state. The 3D module listens for CL "config" events and the price follows the real rules:
  // $219 early supporter price, Sunlit Gold +$30.
  var state = { case: "gold", band: "cognac", size: "sm" };
  CL.config = state; CL.listeners = [];
  CL.onConfig = function (fn) { CL.listeners.push(fn); fn(state); };
  function emit() { CL.listeners.forEach(function (fn) { fn(state); }); }
  var stills = { "gold-cognac": "assets/img/ray-sunlit-gold-cognac-leather.jpg", "gold-onyx": "assets/img/ray-sunlit-gold-onyx-leather.jpg", "gold-carbon": "assets/img/prod-gold-sport.jpg",
                 "silver-cognac": "assets/img/ray-moonlit-silver-cognac-leather.jpg", "silver-onyx": "assets/img/ray-moonlit-silver-onyx-leather.jpg", "silver-carbon": "assets/img/prod-silver-sport.jpg" };
  function render() {
    document.querySelectorAll(".opt").forEach(function (o) { var k = o.dataset.opt; o.querySelectorAll(".choice").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === state[k])); }); });
    document.querySelectorAll("#bandchips .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === state.band)); });
    var price = document.getElementById("price"); if (price) price.textContent = "$" + (219 + (state.case === "gold" ? 30 : 0));
    var still = document.getElementById("config-still"); if (still) still.src = stills[state.case + "-" + state.band];
    emit();
  }
  document.querySelectorAll(".opt .choice").forEach(function (b) { b.addEventListener("click", function () { state[b.closest(".opt").dataset.opt] = b.dataset.v; render(); }); });
  document.querySelectorAll("#bandchips .chip").forEach(function (b) { b.addEventListener("click", function () { state.band = b.dataset.v; render(); CL.scrollTo("#configure"); }); });
  render();
})();
