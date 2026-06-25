// FastVPN Popup Script - Production Version
const SUB_LINKS = [
  'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/Sub1.txt',
  'https://raw.githubusercontent.com/ebrasha/free-v2ray-public-list/refs/heads/main/V2Ray-Config-By-EbraSha-All-Type.txt',
  'https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt',
  'https://raw.githubusercontent.com/freefq/free/master/v2',
  // More reliable public sources can be added here
];

async function fetchSubscriptions() {
  const status = document.getElementById('status');
  const configsDiv = document.getElementById('configs');
  status.textContent = 'Поиск актуальных серверов...';
  configsDiv.innerHTML = '';

  let allConfigs = '';

  for (let url of SUB_LINKS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        allConfigs += text + '\n';
        const p = document.createElement('p');
        p.textContent = `✅ Получено из ${url.split('/').slice(-2).join('/')}`;
        configsDiv.appendChild(p);
      } else {
        const p = document.createElement('p');
        p.textContent = `❌ Не удалось: ${url.split('/').slice(-2).join('/')}`;
        configsDiv.appendChild(p);
      }
    } catch (e) {
      console.error('Failed to fetch', url, e);
      const p = document.createElement('p');
      p.textContent = `❌ Ошибка: ${url.split('/').slice(-2).join('/')}`;
      configsDiv.appendChild(p);
    }
  }

  // Store in storage
  chrome.storage.local.set({v2raySubs: allConfigs});

  status.textContent = `Подписки обновлены! Найдено ~${(allConfigs.length / 1024).toFixed(1)} KB данных.`;
  
  // Show subscription link 
  const subLink = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(allConfigs)));
  const linkEl = document.createElement('a');
  linkEl.href = subLink;
  linkEl.download = 'fastvpn-sub.txt';
  linkEl.textContent = '⬇️ Скачать подписку (.txt)';
  linkEl.style.display = 'block';
  linkEl.style.marginTop = '10px';
  configsDiv.appendChild(linkEl);
}

document.getElementById('fetch').addEventListener('click', fetchSubscriptions);

document.getElementById('v2ray').addEventListener('click', () => {
  chrome.storage.local.get('v2raySubs', (data) => {
    if (data.v2raySubs && data.v2raySubs.trim()) {
      navigator.clipboard.writeText(data.v2raySubs).then(() => {
        alert('✅ Подписка скопирована в буфер обмена! Импортируйте в V2RunTun, Happ, v2rayN, Nekobox и др.');
      }).catch(err => alert('Ошибка копирования: ' + err));
    } else {
      alert('Сначала обновите подписки');
    }
  });
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.storage.local.clear();
  document.getElementById('configs').innerHTML = '';
  document.getElementById('status').textContent = '✅ Данные очищены. Нажмите "Получить свежие подписки"';
});
