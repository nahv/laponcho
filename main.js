// La Poncho Verde — loader ska, video del hero y hojas tipo app.
(function () {
	'use strict';

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const body = document.body;
	const loader = document.getElementById('loader');
	const video = document.getElementById('hero-video');
	const toggle = document.getElementById('video-toggle');

	/* ---------------- Loader ---------------- */

	const MIN_LOADER_MS = reducedMotion ? 0 : 1600; // 4 tiempos a ~150 bpm: que se vea el baile
	const MAX_LOADER_MS = 7000;                      // nunca se queda colgado
	const started = performance.now();
	let loaded = false;

	function finishLoading() {
		if (loaded) return;
		loaded = true;
		clearTimeout(failsafe);
		const wait = Math.max(0, MIN_LOADER_MS - (performance.now() - started));
		setTimeout(() => {
			flyLogo();
			loader.classList.add('is-done');
			body.classList.remove('is-loading');
			setTimeout(() => loader.remove(), 700);
			openFromHash();
		}, wait);
	}
	const failsafe = setTimeout(finishLoading, MAX_LOADER_MS);

	// El escudo del loader sube volando hasta su lugar en el hero (técnica FLIP):
	// una copia fija arranca donde está el del loader (con su pose de baile del momento)
	// y se transforma hasta coincidir con el del hero; ahí se muestra el real.
	function flyLogo() {
		const from = loader.querySelector('.loader__logo');
		const to = document.querySelector('.hero__logo');
		const land = () => body.classList.remove('logo-pending');
		if (reducedMotion || !from || !to || typeof from.animate !== 'function') return land();

		const pose = getComputedStyle(from).transform;
		from.style.animation = 'none';
		const a = from.getBoundingClientRect();
		const b = to.getBoundingClientRect();
		if (!a.width || !b.width) return land();

		const fly = document.createElement('img');
		fly.src = from.currentSrc || from.src;
		fly.alt = '';
		fly.className = 'logo-flyer';
		Object.assign(fly.style, {
			left: a.left + 'px', top: a.top + 'px',
			width: a.width + 'px', height: a.height + 'px'
		});
		body.appendChild(fly);
		from.style.visibility = 'hidden';

		// Con origen O (50% 90%): p' = O + t + s·(p − O). Buscamos que la esquina de A caiga en la de B.
		const s = b.width / a.width;
		const ox = a.left + a.width * 0.5;
		const oy = a.top + a.height * 0.9;
		const tx = b.left - ox - s * (a.left - ox);
		const ty = b.top - oy - s * (a.top - oy);

		const anim = fly.animate([
			{ transform: pose === 'none' ? 'none' : pose },
			{ transform: `translate(${tx}px, ${ty}px) scale(${s * 1.04})`, offset: 0.8 },
			{ transform: `translate(${tx}px, ${ty}px) scale(${s})` }
		], { duration: 1100, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });

		const landed = () => {
			land();
			// el real aparece debajo; la copia se va cuando ya está entero (lighten + lighten = igual)
			setTimeout(() => fly.remove(), 800);
		};
		// Safari viejo tiene animate() pero no la promesa .finished
		if (anim.finished && typeof anim.finished.then === 'function') {
			anim.finished.then(landed, () => { land(); fly.remove(); });
		} else {
			anim.onfinish = landed;
		}
	}

	/* ---------------- Video ---------------- */

	let userPaused = reducedMotion;

	if (reducedMotion) {
		// Sin autoplay: alcanza con tener el primer cuadro (o el poster).
		if (video.readyState >= 2) finishLoading();
		else {
			video.addEventListener('loadeddata', finishLoading, { once: true });
			setTimeout(finishLoading, 1500);
		}
	} else {
		if (!video.paused && video.readyState >= 3) finishLoading();
		video.addEventListener('playing', finishLoading, { once: true });
		video.addEventListener('canplaythrough', () => {
			// Si el navegador bloqueó el autoplay (p. ej. ahorro de batería), probamos a mano.
			if (video.paused && !userPaused) video.play().catch(finishLoading);
			finishLoading();
		}, { once: true });
		const p = video.play();
		if (p && typeof p.catch === 'function') {
			p.catch(() => {
				// Autoplay bloqueado: mostramos el poster y el botón de play.
				syncToggle();
				finishLoading();
			});
		}
	}
	video.addEventListener('error', finishLoading, { once: true });
	const lastSource = video.querySelector('source:last-of-type');
	if (lastSource) lastSource.addEventListener('error', finishLoading, { once: true });

	function syncToggle() {
		const paused = video.paused;
		toggle.setAttribute('aria-pressed', String(paused));
		toggle.setAttribute('aria-label', paused ? 'Reproducir video' : 'Pausar video');
	}
	video.addEventListener('play', syncToggle);
	video.addEventListener('pause', syncToggle);
	syncToggle();

	toggle.addEventListener('click', () => {
		if (video.paused) {
			userPaused = false;
			video.play().catch(() => {});
		} else {
			userPaused = true;
			video.pause();
		}
	});

	// Algunos celulares pausan el video al volver a la pestaña.
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !userPaused && video.paused) {
			video.play().catch(() => {});
		}
	});

	/* ---------------- Hojas (dialog + historial) ---------------- */

	const sheets = {};
	document.querySelectorAll('dialog.sheet').forEach((d) => { sheets[d.id] = d; });
	let current = null;   // id de la hoja abierta
	let lastTrigger = null;

	function show(id) {
		const dialog = sheets[id];
		if (!dialog || current === id) return;
		if (current) hide(current, true);
		current = id;
		if (typeof dialog.showModal === 'function') {
			dialog.showModal();
		} else {
			// Safari < 15.4: sin <dialog> nativo, lo abrimos "a mano"
			dialog.classList.add('sheet--fallback');
			dialog.setAttribute('open', '');
			const closeBtn = dialog.querySelector('[data-close]');
			if (closeBtn) closeBtn.focus();
		}
		dialog.querySelector('.sheet__body').scrollTop = 0;
		// doble rAF: que el navegador pinte el estado inicial antes de animar
		requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
	}

	function hide(id, instant) {
		const dialog = sheets[id];
		if (!dialog) return;
		if (current === id) current = null;
		dialog.classList.remove('is-open', 'is-dragging');
		const panel = dialog.querySelector('.sheet__panel');
		panel.style.transform = '';
		const done = () => {
			if (!dialog.classList.contains('is-open') && dialog.hasAttribute('open')) {
				if (typeof dialog.close === 'function') dialog.close();
				else dialog.removeAttribute('open');
			}
			if (lastTrigger && !current) { lastTrigger.focus({ preventScroll: true }); lastTrigger = null; }
		};
		if (instant || reducedMotion) done();
		else setTimeout(done, 380);
	}

	// Abrir = nueva entrada en el historial, así el "atrás" del celu cierra la hoja.
	function open(id) {
		if (!sheets[id]) return;
		if (history.state && history.state.sheet) history.replaceState({ sheet: id }, '', '#' + id);
		else history.pushState({ sheet: id }, '', '#' + id);
		show(id);
	}

	// Cerrar = volver atrás en el historial (popstate hace el resto).
	function requestClose() {
		if (!current) return;
		if (history.state && history.state.sheet) history.back();
		else {
			history.replaceState(null, '', location.pathname + location.search);
			hide(current);
		}
	}

	window.addEventListener('popstate', (e) => {
		const id = e.state && e.state.sheet;
		if (id && sheets[id]) show(id);
		else if (current) hide(current);
	});

	// Link directo (#somos / #contacto): la hoja se abre cuando termina el loader,
	// y "atrás" vuelve al video en vez de salir del sitio.
	function openFromHash() {
		const id = location.hash.slice(1);
		if (!sheets[id]) return;
		history.replaceState(null, '', location.pathname + location.search);
		open(id);
	}

	document.querySelectorAll('[data-sheet]').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			lastTrigger = btn;
			open(btn.dataset.sheet);
		});
	});

	// Esc sin <dialog> nativo (el nativo avisa con el evento 'cancel')
	document.addEventListener('keydown', (e) => {
		if ((e.key === 'Escape' || e.key === 'Esc') && current && sheets[current].classList.contains('sheet--fallback')) {
			requestClose();
		}
	});

	Object.values(sheets).forEach((dialog) => {
		// Esc
		dialog.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
		// Botón cerrar
		dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', requestClose));
		// Tocar el fondo (fuera del panel)
		dialog.addEventListener('click', (e) => { if (e.target === dialog) requestClose(); });
		enableSwipe(dialog);
	});

	/* Deslizar hacia abajo para cerrar (solo en la vista bottom-sheet) */
	function enableSwipe(dialog) {
		const panel = dialog.querySelector('.sheet__panel');
		const head = dialog.querySelector('[data-drag]');
		const scroller = dialog.querySelector('.sheet__body');
		const isSheetLayout = () => !window.matchMedia('(min-width: 900px)').matches;
		let startY = 0, lastY = 0, lastT = 0, velocity = 0, dragging = false;

		function begin(y) {
			startY = lastY = y; lastT = performance.now(); velocity = 0; dragging = true;
			dialog.classList.add('is-dragging');
		}
		function move(y) {
			const now = performance.now();
			velocity = (y - lastY) / Math.max(1, now - lastT);
			lastY = y; lastT = now;
			const dy = Math.max(0, y - startY);
			panel.style.transform = `translateY(${dy}px)`;
		}
		function end() {
			if (!dragging) return;
			dragging = false;
			dialog.classList.remove('is-dragging');
			const dy = lastY - startY;
			if (dy > Math.min(140, panel.offsetHeight * 0.25) || velocity > 0.6) {
				panel.style.transform = '';
				requestClose();
			} else {
				panel.style.transform = '';
			}
		}

		// Desde la cabecera: siempre arrastra
		head.addEventListener('pointerdown', (e) => {
			if (!isSheetLayout() || e.button !== 0 || e.target.closest('[data-close]')) return;
			head.setPointerCapture(e.pointerId);
			begin(e.clientY);
		});
		head.addEventListener('pointermove', (e) => { if (dragging) move(e.clientY); });
		head.addEventListener('pointerup', end);
		head.addEventListener('pointercancel', end);

		// iOS < 13 no tiene pointer events: lo mismo con touch
		if (!window.PointerEvent) {
			head.addEventListener('touchstart', (e) => {
				if (!isSheetLayout() || e.target.closest('[data-close]')) return;
				begin(e.touches[0].clientY);
			}, { passive: true });
			head.addEventListener('touchmove', (e) => {
				if (!dragging) return;
				e.preventDefault();
				move(e.touches[0].clientY);
			}, { passive: false });
			head.addEventListener('touchend', end);
			head.addEventListener('touchcancel', end);
		}

		// Desde el texto: solo si ya está arriba de todo y el dedo baja
		let touchStartY = 0, armed = false;
		scroller.addEventListener('touchstart', (e) => {
			if (!isSheetLayout()) return;
			touchStartY = e.touches[0].clientY;
			armed = scroller.scrollTop <= 0;
		}, { passive: true });
		scroller.addEventListener('touchmove', (e) => {
			if (!armed) return;
			const y = e.touches[0].clientY;
			if (!dragging) {
				if (y - touchStartY > 6) begin(touchStartY);
				else if (y < touchStartY) { armed = false; return; }
				else return;
			}
			e.preventDefault();
			move(y);
		}, { passive: false });
		scroller.addEventListener('touchend', () => { armed = false; end(); });
		scroller.addEventListener('touchcancel', () => { armed = false; end(); });
	}
})();
