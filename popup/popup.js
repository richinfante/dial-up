// Popup logic for enabling/disabling and managing domains
function getTopLevelDomain(hostname) {
  // Simple TLD extraction (not public suffix list, but works for most cases)
  const parts = hostname.split('.');
  if (parts.length > 2) return parts.slice(-2).join('.');
  return hostname;
}

function renderDomainDelays(domainDelays) {
  const table = document.getElementById('domainList');
  const tbody = table.querySelector('tbody');
  let thead = table.querySelector('thead');
  tbody.innerHTML = '';

  const entries = Object.entries(domainDelays || {}).filter(([_, v]) => v !== undefined).sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) {
    table.style.display = 'none';
    if (thead) thead.style.display = 'none';
    return;
  } else {
    table.style.display = '';
    if (thead) thead.style.display = '';
  }

  // Add header if not present
  if (!thead) {
    thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thDomain = document.createElement('th');
    thDomain.textContent = 'Domain';
    const thDelay = document.createElement('th');
    thDelay.textContent = 'Delay (s)';
    const thActions = document.createElement('th');
    thActions.textContent = 'Actions';
    headerRow.appendChild(thDomain);
    headerRow.appendChild(thDelay);
    headerRow.appendChild(thActions);
    thead.appendChild(headerRow);
    table.insertBefore(thead, tbody);
  }

  entries.forEach(([domain, delay]) => {
    const row = document.createElement('tr');
    const tdDomain = document.createElement('td');
    tdDomain.textContent = domain;
    const tdDelay = document.createElement('td');
    tdDelay.textContent = delay;
    const tdActions = document.createElement('td');
    const btn = document.createElement('button');
    btn.innerHTML = '&times;'; // Cross symbol
    btn.style.minWidth = '0';
    btn.style.fontWeight = 'bold';
    btn.onclick = () => {
      chrome.storage.sync.get(['domainDelays'], (data) => {
        const domainDelays = data.domainDelays || {};
        delete domainDelays[domain];
        chrome.storage.sync.set({domainDelays}, () => {
          renderDomainDelays(domainDelays);
        });
      });
    };
    tdActions.appendChild(btn);
    row.appendChild(tdDomain);
    row.appendChild(tdDelay);
    row.appendChild(tdActions);
    tbody.appendChild(row);
  });
}

function save(domains, domainDelays) {
  chrome.storage.sync.set({disabledDomains: domains, domainDelays: domainDelays || {}}, () => {
    renderDomains(domains);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#icon').src = chrome.runtime.getURL('icon128.png');

  document.getElementById('legal').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const url = new URL(tabs[0].url);
    const tld = getTopLevelDomain(url.hostname);

    chrome.storage.sync.get(['domainDelays'], (data) => {
      renderDomainDelays(data.domainDelays || {});
      const domainDelays = data.domainDelays || {};
      const delay = domainDelays[tld] !== undefined ? domainDelays[tld] : 3;
      const slider = document.getElementById('delaySlider');
      const delayValue = document.getElementById('delayValue');
      slider.value = delay;
      delayValue.textContent = delay;

      // Update label to show TLD
      const label = document.querySelector('label[for="delaySlider"]');
      if (label) {
        label.innerHTML = `Delay for <b style="margin-left: 0.5ex">${tld}</b>: <span id="delayValue" style="margin-right: 0.5ex; margin-left: 0.5ex;">${delay}</span> seconds`;
      }

      slider.oninput = () => {
        const val = slider.value;
        const delayValueSpan = document.getElementById('delayValue');
        if (delayValueSpan) delayValueSpan.textContent = val;
      };
      slider.onchange = () => {
        domainDelays[tld] = Number(slider.value);
        chrome.storage.sync.set({domainDelays}, () => {
          renderDomainDelays(domainDelays);
        });
      };
    });
  });
});
