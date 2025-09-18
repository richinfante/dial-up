// Popup logic for enabling/disabling and managing domains
function getTopLevelDomain(hostname) {
  // Simple TLD extraction (not public suffix list, but works for most cases)
  const parts = hostname.split('.');
  if (parts.length > 2) return parts.slice(-2).join('.');
  return hostname;
}

function renderDomains(domains) {
  const table = document.getElementById('domainList');
  const tbody = table.querySelector('tbody');
  let thead = table.querySelector('thead');
  tbody.innerHTML = '';

  if (!domains.length) {
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
    const thActions = document.createElement('th');
    thActions.textContent = 'Actions';
    headerRow.appendChild(thDomain);
    headerRow.appendChild(thActions);
    thead.appendChild(headerRow);
    table.insertBefore(thead, tbody);
  }

  domains.forEach((domain, idx) => {
    const row = document.createElement('tr');
    const tdDomain = document.createElement('td');
    tdDomain.textContent = domain;
    const tdActions = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.onclick = () => {
      domains.splice(idx, 1);
      save(domains);
    };
    tdActions.appendChild(btn);
    row.appendChild(tdDomain);
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
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const url = new URL(tabs[0].url);
    const tld = getTopLevelDomain(url.hostname);

    chrome.storage.sync.get(['disabledDomains', 'domainDelays'], (data) => {
      renderDomains(data.disabledDomains || []);
      const domainDelays = data.domainDelays || {};
      const delay = domainDelays[tld] !== undefined ? domainDelays[tld] : 3;
      const slider = document.getElementById('delaySlider');
      const delayValue = document.getElementById('delayValue');
      slider.value = delay;
      delayValue.textContent = delay;

      slider.oninput = () => {
        delayValue.textContent = slider.value;
      };
      slider.onchange = () => {
        domainDelays[tld] = Number(slider.value);
        chrome.storage.sync.set({domainDelays});
      };
    });
  });

  document.getElementById('addDomain').onclick = () => {
    const input = document.getElementById('domainInput');
    const domain = input.value.trim();
    if (!domain) return;
    chrome.storage.sync.get(['disabledDomains', 'domainDelays'], (data) => {
      const domains = data.disabledDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        save(domains, data.domainDelays);
      }
      input.value = '';
    });
  };
});
