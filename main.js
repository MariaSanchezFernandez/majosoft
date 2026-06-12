/* ============================================================
   Majosoft — animaciones (GSAP + ScrollTrigger)
============================================================ */
/* Si GSAP no cargó (CDN bloqueado, etc.), mostramos todo y salimos sin romper la página */
if (typeof gsap === 'undefined') {
  document.documentElement.classList.remove('js');
} else {

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover)').matches;

/* ---------- Hero: split en palabras (conservando el span .accent) ---------- */
function splitHero() {
  document.querySelectorAll('.hero-title .line').forEach((line) => {
    const frag = document.createDocumentFragment();
    Array.from(line.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((piece) => {
          if (piece.trim() === '') { frag.appendChild(document.createTextNode(piece)); return; }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = piece;
          frag.appendChild(span);
        });
      } else {
        // elemento (p.ej. .accent): se anima como una sola "palabra"
        if (node.classList) node.classList.add('word');
        frag.appendChild(node);
      }
    });
    line.innerHTML = '';
    line.appendChild(frag);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (reduceMotion) {
    gsap.set('.reveal, .reveal-head, .hero-title .line', { opacity: 1, y: 0 });
  } else {
    splitHero();

    /* Hero timeline */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-title .word', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06 });
    gsap.to('#inicio .reveal', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, delay: 0.5, ease: 'power3.out' });

    /* Cabeceras de sección: clip-reveal */
    gsap.utils.toArray('.reveal-head').forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* Reveal por scroll genérico */
    gsap.utils.toArray('.reveal').forEach((el) => {
      if (el.closest('#inicio')) return;
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* Subrayado dibujado a mano del hero */
    const underline = document.querySelector('.hand-underline path');
    if (underline) {
      const len = underline.getTotalLength();
      gsap.set(underline, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(underline, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', delay: 1.1 });
    }

    /* Hero: parallax + fundido al hacer scroll */
    gsap.to('.hero-wrap', {
      y: 70, opacity: 0.12, ease: 'none',
      scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true },
    });

    /* Glows con parallax */
    gsap.to('.glow-1', { yPercent: 35, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    gsap.to('.glow-2', { yPercent: -30, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1.3 } });

    /* Línea de proceso ligada al scroll */
    const progress = document.querySelector('.process__progress');
    if (progress) {
      gsap.to(progress, { width: '100%', ease: 'none',
        scrollTrigger: { trigger: '.process', start: 'top 68%', end: 'bottom 72%', scrub: true } });
    }

    /* Resaltado del nº de paso según avanza el scroll */
    gsap.utils.toArray('.step').forEach((step) => {
      const num = step.querySelector('.step__num');
      ScrollTrigger.create({
        trigger: step, start: 'top 65%', end: 'bottom 35%',
        onEnter: () => gsap.to(num, { backgroundColor: '#d6e022', borderColor: '#d6e022', color: '#15161a', duration: 0.4 }),
        onLeaveBack: () => gsap.to(num, { backgroundColor: '#f5f4ec', borderColor: '#15161a', color: '#15161a', duration: 0.4 }),
      });
    });
  }

  /* Barra de progreso de scroll */
  const bar = document.querySelector('.scroll-progress');
  if (bar) {
    gsap.to(bar, { width: '100%', ease: 'none',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
  }
});

/* ---------- Spotlight que sigue al ratón ---------- */
document.querySelectorAll('.spotlight').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- Botones magnéticos ---------- */
if (!reduceMotion && canHover) {
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.4, duration: 0.4, ease: 'power3.out' });
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ---------- Header sólido al hacer scroll ---------- */
const header = document.querySelector('.site-header');
if (header) {
  ScrollTrigger.create({ start: 'top -40', onUpdate: (self) => header.classList.toggle('scrolled', self.scroll() > 40) });
}

/* ---------- Cursor personalizado ---------- */
if (canHover && !reduceMotion) {
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { ...mouse };
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    gsap.set(dot, { x: mouse.x, y: mouse.y });
  });
  gsap.ticker.add(() => {
    ringPos.x += (mouse.x - ringPos.x) * 0.18;
    ringPos.y += (mouse.y - ringPos.y) * 0.18;
    gsap.set(ring, { x: ringPos.x, y: ringPos.y });
  });
  document.querySelectorAll('a, button, .bento, .svc, input, textarea').forEach((el) => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });
}

/* ---------- Formulario de contacto ---------- */
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    const data = new FormData(form);
    const nombre = (data.get('nombre') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const mensaje = (data.get('mensaje') || '').toString().trim();

    if (!nombre || !email || !mensaje) {
      status.textContent = 'Por favor, completa todos los campos.';
      gsap.fromTo(form, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
      return;
    }

    // Sin backend: abrimos el cliente de correo con el mensaje preparado.
    // Para recibir los envíos directamente, cambia esto por Formspree/Getform.
    const asunto = encodeURIComponent(`Nuevo proyecto · ${nombre}`);
    const cuerpo = encodeURIComponent(`Nombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`);
    window.location.href = `mailto:dev@majosoft.es?subject=${asunto}&body=${cuerpo}`;
    status.textContent = '¡Gracias! Abriendo tu cliente de correo…';
    form.reset();
  });
}

} // fin del else (GSAP disponible)
