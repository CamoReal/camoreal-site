document.getElementById('year').textContent = new Date().getFullYear();

const avatar = document.getElementById('avatar');
const avatarFallback = document.getElementById('avatarFallback');

if (avatar && avatarFallback) {
  avatar.addEventListener('error', () => {
    avatar.classList.add('is-broken');
  }, { once: true });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll('[data-reveal]');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => revealObserver.observe(el));
}

// Twitch live detection: a muted embed player fires ONLINE/OFFLINE events,
// which toggle the stream section and the LIVE NOW! badge. No API keys needed.
const TWITCH_CHANNEL = 'camoreal';
const streamSection = document.getElementById('streamSection');
const liveBadge = document.getElementById('liveBadge');

if (window.Twitch && streamSection && liveBadge) {
  try {
    const player = new Twitch.Player('streamPlayer', {
      channel: TWITCH_CHANNEL,
      width: '100%',
      height: '100%',
      muted: true,
      autoplay: true,
    });

    const goLive = () => {
      streamSection.hidden = false;
      liveBadge.hidden = false;
    };

    const goOffline = () => {
      streamSection.hidden = true;
      liveBadge.hidden = true;
    };

    player.addEventListener(Twitch.Player.ONLINE, goLive);
    player.addEventListener(Twitch.Player.PLAYING, goLive);
    player.addEventListener(Twitch.Player.OFFLINE, goOffline);
    player.addEventListener(Twitch.Player.ENDED, goOffline);
  } catch (err) {
    // Embed unavailable (e.g. file:// preview) — page works fine without it.
  }
}
