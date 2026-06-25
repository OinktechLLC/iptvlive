// Live timer update
function updateTimer() {
  fetch('/').then(r => r.text()).then(html => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const timerEl = doc.getElementById('timer');
    if (timerEl) document.getElementById('timer').innerHTML = timerEl.innerHTML;
  });
}
setInterval(updateTimer, 1000);

// Push notifications demo
if ('Notification' in window && 'serviceWorker' in navigator) {
  // Register SW etc for real prod
  console.log('Push ready');
}

// Reading history simulation
console.log('Forum loaded - tracking enabled');