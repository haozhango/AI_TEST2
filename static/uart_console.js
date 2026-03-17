const deviceSelect = document.getElementById('deviceSelect');
const uartOutput = document.getElementById('uartOutput');
const clearBtn = document.getElementById('clearBtn');

const buffers = new Map();
let currentDevice = '';
let socket = null;
let pingTimer = null;

function ensureDeviceOption(device) {
  if (!buffers.has(device)) buffers.set(device, []);
  const hasOption = Array.from(deviceSelect.options).some((opt) => opt.value === device);
  if (!hasOption) {
    const option = document.createElement('option');
    option.value = device;
    option.textContent = device;
    deviceSelect.appendChild(option);
  }

  if (!currentDevice) {
    currentDevice = device;
    deviceSelect.value = device;
  }
}

function renderCurrentDevice() {
  if (!currentDevice) {
    uartOutput.textContent = 'No UART device found yet.';
    return;
  }
  const lines = buffers.get(currentDevice) || [];
  uartOutput.textContent = lines.length ? lines.join('\n') : `No output from ${currentDevice} yet.`;
  uartOutput.scrollTop = uartOutput.scrollHeight;
}

function appendLine(device, line, ts) {
  ensureDeviceOption(device);
  const list = buffers.get(device) || [];
  const text = `[${ts}] ${line}`;
  list.push(text);
  if (list.length > 600) list.shift();
  buffers.set(device, list);
  if (device === currentDevice) renderCurrentDevice();
}

function consumeSnapshot(devices) {
  Object.entries(devices || {}).forEach(([device, lines]) => {
    ensureDeviceOption(device);
    const normalized = (lines || []).map((item) => `[${item.ts || ''}] ${item.line || ''}`);
    buffers.set(device, normalized.slice(-600));
  });
  renderCurrentDevice();
}

function connectSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}/ws/uart`);

  socket.onopen = () => {
    if (pingTimer) window.clearInterval(pingTimer);
    pingTimer = window.setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) socket.send('ping');
    }, 15000);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'snapshot') {
        consumeSnapshot(msg.devices || {});
        return;
      }
      if (msg.type === 'line' || msg.type === 'status') {
        appendLine(msg.device || 'unknown', msg.line || '', msg.ts || '');
      }
    } catch (_) {}
  };

  socket.onclose = () => {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
    window.setTimeout(connectSocket, 1500);
  };
}

deviceSelect.addEventListener('change', () => {
  currentDevice = deviceSelect.value;
  renderCurrentDevice();
});

clearBtn.addEventListener('click', () => {
  if (!currentDevice) return;
  buffers.set(currentDevice, []);
  renderCurrentDevice();
});

connectSocket();
