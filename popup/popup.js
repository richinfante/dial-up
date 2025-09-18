// Popup logic for enabling/disabling and managing domains
function renderDomains(domains) {
  const list = document.getElementById('domainList');
  list.innerHTML = '';
  domains.forEach((domain, idx) => {
    const li = document.createElement('li');
    li.textContent = domain + ' ';
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.onclick = () => {
      domains.splice(idx, 1);
      save(domains);
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}
function save(domains, enabled) {
  chrome.storage.sync.set({disabledDomains: domains, enabled: enabled !== false}, () => {
    renderDomains(domains);
    document.getElementById('enableToggle').checked = enabled !== false;
  });
}
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['disabledDomains', 'enabled'], (data) => {
    renderDomains(data.disabledDomains || []);
    document.getElementById('enableToggle').checked = data.enabled !== false;
  });
  document.getElementById('addDomain').onclick = () => {
    const input = document.getElementById('domainInput');
    const domain = input.value.trim();
    if (!domain) return;
    chrome.storage.sync.get(['disabledDomains'], (data) => {
      const domains = data.disabledDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        save(domains, document.getElementById('enableToggle').checked);
      }
      input.value = '';
    });
  };
  document.getElementById('enableToggle').onchange = (e) => {
    chrome.storage.sync.get(['disabledDomains'], (data) => {
      save(data.disabledDomains || [], e.target.checked);
    });
  };
});
