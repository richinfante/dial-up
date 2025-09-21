// Injects delay if not excluded
(function () {
  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
  chrome.runtime.sendMessage({ type: 'getSettings' }, ({ disabledDomains, enabled }) => {
    // Get per-domain delay from storage
    chrome.storage.sync.get(['domainDelays'], (data) => {
      const domainDelays = data.domainDelays || {};
      const domain = getDomain(window.location.href);
      // Extract TLD for per-domain config
      function getTopLevelDomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length > 2) return parts.slice(-2).join('.');
        return hostname;
      }
      const tld = getTopLevelDomain(domain);
      const delay = (domainDelays[tld] !== undefined ? domainDelays[tld] : 3) * 1000;
      // Exclude if domain or any parent domain is in the exclusion list
      if (
        delay === 0 ||
        (disabledDomains && disabledDomains.some(excluded => domain === excluded || domain.endsWith('.' + excluded)))
      ) return;


      function injectOverlay() {
        let played = false;
        let audio = null
        // Remove any existing overlay first
        const existing = document.getElementById('slowmedown-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = '#fff';
        overlay.style.zIndex = '2147483647';
        overlay.style.transition = 'opacity 0.1s';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.id = 'slowmedown-overlay';

        const title = document.createElement('a');
        title.textContent = 'Dial_Up v1.0 - by @richinfante. Slow down your browsing experience!';
        title.style.fontFamily = 'Arial, sans-serif';
        title.style.fontSize = '10pt';
        title.style.fontWeight = 'light';
        title.style.color = '#c1c1c1';
        title.style.marginBottom = '20px';
        title.style.textDecoration = 'none';
        title.style.target = '_blank';
        title.style.position = 'absolute';
        title.style.bottom = '10px';
        title.style.left = '50%';
        title.href = 'https://www.richinfante.com/2025/08/22/slow-browsing-experience-down-chrome-extension/';
        title.style.transform = 'translateX(-50%)';
        title.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          window.open(title.href, '_blank');
        };
        overlay.appendChild(title);

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'center';
        row.style.alignItems = 'center';
        row.style.marginBottom = '20px';
        overlay.appendChild(row);

        // add icon128.png to the row
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icon128.png');
        icon.alt = 'Dial_Up';
        icon.style.width = '128px';
        icon.style.height = '128px';
        icon.style.marginRight = '20px';
        icon.style.marginBottom = '0px';
        icon.style.imageRendering = 'pixelated';
        icon.style.cursor = 'pointer';
        row.appendChild(icon);

        icon.onclick = () => {
          if (played) return;
          played = true;
          // play dial-up sound
          audio = new Audio(chrome.runtime.getURL('sounds/dial-up-internet-sound.mp3'));
          audio.play();
        };

        const barWrapper = document.createElement('div');
        barWrapper.style.display = 'flex';
        barWrapper.style.flexDirection = 'column';
        barWrapper.style.alignItems = 'start';
        row.appendChild(barWrapper);

        const text = document.createElement('div');
        text.textContent = `Connecting...`;
        text.style.fontFamily = 'Arial, sans-serif';
        text.style.fontSize = '24px';
        text.style.color = '#010081';
        text.style.marginBottom = '10px';
        barWrapper.appendChild(text);

        // loading bar div
        const barContainer = document.createElement('div');
        barContainer.style.width = '200px';
        barContainer.style.height = '15px';
        barContainer.style.border = '2px solid #010081';
        barContainer.style.overflow = 'hidden';
        barContainer.style.position = 'relative';
        barWrapper.appendChild(barContainer);

        const bar = document.createElement('div');
        bar.style.width = '0%';
        bar.style.height = '100%';
        bar.style.background = '#010081';
        bar.style.position = 'absolute';
        barContainer.appendChild(bar);

        // globe.png
        const globe = document.createElement('img');
        globe.src = chrome.runtime.getURL('globe.png');
        globe.alt = 'Globe';
        globe.style.width = '128px';
        globe.style.height = '128px';
        globe.style.marginLeft = '20px';
        globe.style.marginBottom = '0px';
        globe.style.imageRendering = 'pixelated';
        row.appendChild(globe);

        // animate the bar for the duration of the delay
        let start = null;
        function animate(timestamp) {
          if (!start) start = timestamp;
          const progress = timestamp - start;
          const percent = Math.min(progress / delay, 1);
          bar.style.width = `${(percent * 100)}%`;
          if (progress < delay) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);

        document.documentElement.appendChild(overlay);
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => {
            audio?.pause?.();
            audio = null;
            overlay.remove();
          }, 100);
        }, delay);
      }

      // --- Robust SPA URL change detection ---
      let lastPath = location.pathname + location.search + location.hash;
      function checkPathChange() {
        const currentPath = location.pathname + location.search + location.hash;
        if (currentPath !== lastPath) {
          lastPath = currentPath;
          injectOverlay();
        }
      }

      // Listen for popstate and hashchange
      window.addEventListener('popstate', checkPathChange);
      window.addEventListener('hashchange', checkPathChange);

      // Monkey-patch pushState and replaceState
      const origPushState = history.pushState;
      history.pushState = function () {
        origPushState.apply(this, arguments);
        checkPathChange();
      };
      const origReplaceState = history.replaceState;
      history.replaceState = function () {
        origReplaceState.apply(this, arguments);
        checkPathChange();
      };

      // MutationObserver fallback for advanced SPA navigation (e.g., Reddit)
      const observer = new MutationObserver(() => {
        checkPathChange();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Initial overlay injection
      injectOverlay();



      // Delay XMLHttpRequest
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function () {
        this.addEventListener('readystatechange', function () {
          if (this.readyState === 1) {
            const origOnReadyStateChange = this.onreadystatechange;
            this.onreadystatechange = function () {
              setTimeout(() => {
                if (origOnReadyStateChange) origOnReadyStateChange.apply(this, arguments);
              }, delay);
            };
          }
        });
        origOpen.apply(this, arguments);
      };

      // Delay fetch
      if (window.fetch) {
        const origFetch = window.fetch;
        window.fetch = function () {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              origFetch.apply(window, arguments).then(resolve).catch(reject);
            }, delay);
          });
        };
      }

      // Delay DOMContentLoaded
      const origAddEventListener = document.addEventListener;
      document.addEventListener = function (type, listener, options) {
        if (type === 'DOMContentLoaded') {
          const wrapped = function (event) {
            setTimeout(() => listener(event), delay);
          };
          origAddEventListener.call(document, type, wrapped, options);
        } else {
          origAddEventListener.call(document, type, listener, options);
        }
      };
    });
  });
})();
