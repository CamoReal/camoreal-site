(() => {
  'use strict';
  const config = window.CAMO_CONFIG;
  const $ = id => document.getElementById(id);
  $('year').textContent = new Date().getFullYear();
  const target = new Date(config.GO_LIVE_AT).getTime();
  const validDate = Number.isFinite(target);
  if (validDate) $('liveDate').textContent = new Intl.DateTimeFormat('en-US', {
    month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit',
    timeZone:'America/New_York', timeZoneName:'short'
  }).format(new Date(target));
  function updateCountdown() {
    if (!validDate) {
      $('countdown').hidden = true; $('countdownHeading').textContent = 'STAY TUNED';
      $('liveDate').textContent = 'Marathon date to be announced.'; return;
    }
    const seconds = Math.max(0,Math.ceil((target - Date.now()) / 1000));
    const numbers = [Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
    ['cdDays','cdHours','cdMins','cdSecs'].forEach((id,i) => $(id).textContent = String(numbers[i]).padStart(2,'0'));
    if (!seconds) {
      $('countdown').hidden = true;
      $('countdownHeading').textContent = 'IT’S MARATHON TIME';
      $('liveDate').textContent = 'Head to Twitch for the current stream status.';
    }
  }
  updateCountdown();
  if (validDate) setInterval(updateCountdown,1000);
  // A missing trailer is an honest coming-soon state, never a dead play button.
  const trailer = config.TRAILER_YOUTUBE_ID.trim();
  const trailerVideo = (config.TRAILER_VIDEO || '').trim();
  let trailerURL = '';
  if (trailerVideo && /^(https?:\/\/|\.?\.?\/|assets\/)/.test(trailerVideo)) {
    const player = document.createElement('video');
    player.src = trailerVideo; player.controls = true; player.playsInline = true;
    player.preload = 'metadata'; player.setAttribute('aria-label','CAMO GTA VI Marathon trailer');
    $('trailerFrame').replaceChildren(player); trailerURL = trailerVideo;
  } else if (/^[A-Za-z0-9_-]{11}$/.test(trailer)) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${trailer}?rel=0&playsinline=1`;
    iframe.title = 'CAMO GTA VI Marathon trailer'; iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    $('trailerFrame').replaceChildren(iframe); $('trailerFrame').classList.add('has-video');
    trailerURL = `https://www.youtube.com/watch?v=${trailer}`;
  }
  if (trailerURL) {
    $('trailerLink').href = trailerURL; $('trailerLink').hidden = false;
    $('trailerLinkPending').hidden = true;
  }

  const intro = $('intro'), gate = $('introGate'), stage = $('introStage'), video = $('introVideo');
  const site = $('site'), reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  // A single fixed scene follows scrolling at three depths. No scrolling panels.
  const scene = document.querySelector('.scene');
  let framePending = false;
  function paintScene() {
    const max = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
    const progress = reduced.matches ? 0 : Math.min(1,Math.max(0,window.scrollY / max));
    scene.style.setProperty('--scroll',String(progress));
    framePending = false;
  }
  function queueScene() { if (!framePending) { framePending = true; requestAnimationFrame(paintScene); } }
  window.addEventListener('scroll',queueScene,{passive:true});
  window.addEventListener('resize',queueScene,{passive:true});
  reduced.addEventListener('change',queueScene);
  paintScene();
  let running = false, timers = [], stopAudio = () => {}, restoreFocus = null;
  function schedule(fn,ms) { timers.push(setTimeout(fn,ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function remember() { try { sessionStorage.setItem('camo-intro-v2','seen'); } catch {} }
  function finish() {
    if (intro.hidden) return;
    clearTimers(); stopAudio(); stopAudio = () => {}; video.pause();
    video.hidden = true; intro.hidden = true; intro.classList.remove('is-leaving');
    stage.classList.remove('playing'); stage.hidden = true; running = false;
    site.inert = false; document.body.classList.remove('intro-active'); remember();
    (restoreFocus || $('main')).focus({preventScroll:true}); restoreFocus = null;
  }
  function leave() {
    intro.classList.add('is-leaving'); schedule(finish,reduced.matches ? 0 : 350);
  }
  function showIntro(isReplay = false) {
    clearTimers(); restoreFocus = isReplay ? $('replayIntro') : null;
    intro.hidden = false; intro.classList.remove('is-leaving'); gate.hidden = false;
    stage.hidden = true; stage.classList.remove('playing'); video.hidden = true;
    $('skipIntro').hidden = true; site.inert = true; document.body.classList.add('intro-active');
    $('enterSound').focus({preventScroll:true});
  }
  function animatedIntro(sound) {
    video.hidden = true; stage.hidden = false;
    stage.classList.remove('playing'); void stage.offsetWidth; stage.classList.add('playing');
    if (sound) { try { stopAudio = window.playCamoSting(); } catch {} }
    schedule(leave,reduced.matches ? 650 : config.INTRO_DURATION_MS);
  }
  function start(sound) {
    if (running) return; running = true;
    gate.hidden = true; $('skipIntro').hidden = false; $('skipIntro').focus({preventScroll:true});
    if (config.INTRO_VIDEO && !reduced.matches) {
      video.src = config.INTRO_VIDEO; video.muted = !sound; video.hidden = false;
      let failed = false;
      const fallback = () => { if (failed || !running) return; failed = true; clearTimers(); video.pause(); animatedIntro(sound); };
      video.onended = () => { if (running && !failed) leave(); };
      video.onerror = fallback;
      video.play().catch(fallback);
      // A malformed or stalled upload must never trap a visitor in the intro.
      schedule(() => { if (running && !failed) leave(); },8000);
    } else animatedIntro(sound);
  }
  $('enterSound').addEventListener('click',() => start(true));
  $('enterSilent').addEventListener('click',() => start(false));
  $('skipIntro').addEventListener('click',finish);
  $('replayIntro').addEventListener('click',() => showIntro(true));
  intro.addEventListener('keydown',event => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    if (event.key === 'Tab') {
      const buttons = [...intro.querySelectorAll('button')].filter(el => el.getClientRects().length);
      const first = buttons[0], last = buttons[buttons.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  let seen = false; try { seen = sessionStorage.getItem('camo-intro-v2') === 'seen'; } catch {}
  if (!seen && !reduced.matches) showIntro();
})();
