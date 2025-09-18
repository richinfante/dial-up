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

        // Add wlan.gif centered
        const img = document.createElement('img');
        img.src = chrome.runtime.getURL('wlan.gif');
        img.alt = 'Loading...';
        img.style.imageRendering = 'pixelated';
        img.style.minWidth = '256px';
        // img.style.maxWidth = '256px';
        // img.style.maxHeight = '128px';
        overlay.appendChild(img);

        document.documentElement.appendChild(overlay);
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 100);
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
