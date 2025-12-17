// Minimal, performant JS. Defer this file in index.html to avoid blocking.

(function(){
	// Cache nodes
	const reveals = document.querySelectorAll('.reveal');
	const socials = document.querySelectorAll('.social');
	const parallaxEls = document.querySelectorAll('[data-speed]');
	const mobileVideo = document.querySelector('.video--mobile');
	const desktopVideo = document.querySelector('.video--desktop');
	const scrollWidget = document.getElementById('scroll-down');

	// IntersectionObserver to toggle .in-view for reveal sections
	const obsOptions = {threshold: 0.15};
	const observer = new IntersectionObserver((entries)=>{
		entries.forEach(entry=>{
			if(entry.isIntersecting){
				entry.target.classList.add('in-view');
			} else {
				entry.target.classList.remove('in-view');
			}
		});
	}, obsOptions);
	reveals.forEach(r => observer.observe(r));

	// Video loader: only set src on the proper video to avoid double-downloads
	const breakpoint = 900; // matches CSS media query
	function setVideoForViewport(e){
		const wide = window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
		if(wide){
			// activate desktop
			const ds = desktopVideo && desktopVideo.dataset && desktopVideo.dataset.src;
			if(ds && desktopVideo.src !== ds){
				desktopVideo.src = ds;
				desktopVideo.setAttribute('preload','metadata');
				desktopVideo.load();
				desktopVideo.play().catch(()=>{});
			}
			// deactivate mobile
			if(mobileVideo && mobileVideo.src){
				try{ mobileVideo.pause(); }catch{}
				mobileVideo.removeAttribute('src');
				mobileVideo.load();
			}
		} else {
			// activate mobile
			const ms = mobileVideo && mobileVideo.dataset && mobileVideo.dataset.src;
			if(ms && mobileVideo.src !== ms){
				mobileVideo.src = ms;
				mobileVideo.setAttribute('preload','metadata');
				mobileVideo.load();
				mobileVideo.play().catch(()=>{});
			}
			// deactivate desktop
			if(desktopVideo && desktopVideo.src){
				try{ desktopVideo.pause(); }catch{}
				desktopVideo.removeAttribute('src');
				desktopVideo.load();
			}
		}
	}

	// run on load
	document.addEventListener('DOMContentLoaded', setVideoForViewport);
	// respond to changes (modern API with fallback)
	const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
	if(typeof mql.addEventListener === 'function'){
		mql.addEventListener('change', setVideoForViewport);
	} else if(typeof mql.addListener === 'function'){
		mql.addListener(setVideoForViewport);
	}

	// Animate social icons: appear at 1.5s (logo animation starts at 1s via CSS),
	// scroll widget becomes visible at 2s.
	setTimeout(()=> {
		requestAnimationFrame(()=> {
			socials.forEach((el, i) => {
				setTimeout(()=> el.classList.add('visible'), i * 140);
			});
		});
	}, 8000); // 1.5s

	setTimeout(()=>{
		if(scrollWidget) scrollWidget.classList.add('visible');
	}, 8000); // 2s

	// Lightweight parallax using requestAnimationFrame (reads minimal DOM)
	let lastY = window.scrollY;
	let ticking = false;
	function onScroll(){
		lastY = window.scrollY;
		if(!ticking){
			ticking = true;
			requestAnimationFrame(updateParallax);
		}
	}
	function updateParallax(){
		parallaxEls.forEach(el=>{
			const speed = parseFloat(el.getAttribute('data-speed')) || 0;
			const rect = el.getBoundingClientRect();
			const offset = (window.innerHeight - rect.top) * speed;
			el.style.transform = `translateY(${Math.max(-60, Math.min(60, offset))}px)`;
		});
		ticking = false;
	}
	window.addEventListener('scroll', onScroll, {passive:true});

	// Keep videos playing if browser paused them (mobile heuristics)
	document.addEventListener('visibilitychange', () => {
		document.querySelectorAll('video').forEach(v => {
			if(document.visibilityState === 'visible'){ v.play().catch(()=>{}); }
		});
	});
})();
