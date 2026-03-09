const newJobsList = document.getElementById('newJobsList');
const template = document.getElementById('newJobTemplate');
const uartTemplate = document.getElementById('uartTemplate');
const recentJobs = document.getElementById('recentJobs');
const addJobBtn = document.getElementById('addJobBtn');
const form = document.getElementById('newJobsForm');
let currentUser = 'user';

function makeJobsId() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const ts = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const user = currentUser;
  return `${user}_${ts}`;
}

function addUartItem(card, value = '') {
  const uartList = card.querySelector('.uart-list');
  const item = uartTemplate.content.firstElementChild.cloneNode(true);
  const input = item.querySelector('.uart-input');
  input.value = value;
  item.querySelector('.remove-uart-btn').addEventListener('click', () => {
    item.remove();
  });
  uartList.appendChild(item);
}

function bindBitfileMode(card) {
  const mode = card.querySelector('.bitfile-mode');
  const bitfileInput = card.querySelector('.bitfile-path');
  const toggle = () => {
    const isLatest = mode.value === 'latest';
    bitfileInput.disabled = isLatest;
    bitfileInput.placeholder = isLatest ? 'Bitfile is resolved automatically' : '/path/to/xxx.bit';
    if (isLatest) {
      bitfileInput.value = '';
    }
  };
  mode.addEventListener('change', toggle);
  toggle();
}

function bindBrowseBinfile(card) {
  const btn = card.querySelector('.browse-btn');
  const target = card.querySelector('.binfile-path');
  btn.addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.onchange = () => {
      if (picker.files && picker.files[0]) {
        target.value = picker.files[0].name;
      }
    };
    picker.click();
  });
}

function createNewJobCard(prefill = {}) {
  const node = template.content.firstElementChild.cloneNode(true);

  const jobsId = prefill.jobs_id || makeJobsId();
  node.querySelector('input[name="jobs_id"]').value = jobsId;
  node.querySelector('select[name="haps_platform"]').value = prefill.haps_platform || 'BJ-HAPS80';
  node.querySelector('select[name="bitfile_mode"]').value = prefill.bitfile_mode || 'path';
  node.querySelector('input[name="bitfile"]').value = prefill.bitfile && prefill.bitfile !== 'GET_LATEST' ? prefill.bitfile : '';
  node.querySelector('input[name="binfile"]').value = prefill.binfile || '';
  node.querySelector('input[name="log_path"]').value = prefill.log_path || '';

  const openocdCfg = prefill.openocd_cfg || {};
  node.querySelector('input[name="openocd_tool_path"]').value = openocdCfg.tool_path || '';
  node.querySelector('input[name="openocd_cfg_file"]').value = openocdCfg.cfg_file || '';

  const uartValues = prefill.uart_paths || [''];
  uartValues.forEach((val) => addUartItem(node, val));

  node.querySelector('.add-uart-btn').addEventListener('click', () => addUartItem(node));
  bindBitfileMode(node);
  bindBrowseBinfile(node);

  node.querySelector('.remove-btn').addEventListener('click', () => {
    node.remove();
    if (!newJobsList.children.length) createNewJobCard();
  });

  newJobsList.appendChild(node);
}

function collectNewJobs() {
  return Array.from(newJobsList.querySelectorAll('.job-card')).map((card) => {
    const uartPaths = Array.from(card.querySelectorAll('.uart-input'))
      .map((input) => input.value.trim())
      .filter(Boolean);

    return {
      jobs_id: card.querySelector('input[name="jobs_id"]').value.trim(),
      haps_platform: card.querySelector('select[name="haps_platform"]').value,
      bitfile_mode: card.querySelector('select[name="bitfile_mode"]').value,
      bitfile: card.querySelector('input[name="bitfile"]').value.trim(),
      binfile: card.querySelector('input[name="binfile"]').value.trim(),
      log_path: card.querySelector('input[name="log_path"]').value.trim(),
      openocd_cfg: {
        tool_path: card.querySelector('input[name="openocd_tool_path"]').value.trim(),
        cfg_file: card.querySelector('input[name="openocd_cfg_file"]').value.trim(),
      },
      uart_paths: uartPaths,
    };
  });
}

async function submitJobs(event) {
  event.preventDefault();
  const jobs = collectNewJobs();
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobs }),
  });

  if (!response.ok) {
    const text = await response.text();
    alert(`Submit failed: ${text}`);
    return;
  }

  alert('Submitted successfully');
  newJobsList.innerHTML = '';
  createNewJobCard();
  await refreshRecentJobs();
}

async function finishJob(jobId) {
  const yes = window.confirm('Finish this running job?');
  if (!yes) return;

  const response = await fetch(`/api/jobs/${jobId}/stop`, { method: 'POST' });
  if (!response.ok) {
    alert('Finish failed');
    return;
  }
  await refreshRecentJobs();
}

function renderRecentJobs(jobs) {
  recentJobs.innerHTML = '';
  if (!jobs.length) {
    recentJobs.textContent = 'No jobs yet';
    return;
  }

  jobs.forEach((job) => {
    const item = document.createElement('div');
    item.className = 'recent-card';

    const payload = job.payload || {};
    item.innerHTML = `
      <div class="kv"><span class="key">JobsID</span><span class="val">${payload.jobs_id || '-'}</span></div>
      <div class="kv"><span class="key">Status</span><span class="val status ${job.status}">${job.status}</span></div>
      <div class="kv"><span class="key">Endtime</span><span class="val">${job.end_time || '-'}</span></div>
      <div class="kv"><span class="key">Log Path</span><span class="val">${payload.log_path || '-'}</span></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to New Jobs';
    copyBtn.className = 'copy-btn';
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => createNewJobCard(payload));
    actions.appendChild(copyBtn);

    if (job.status === 'Runing') {
      const finishBtn = document.createElement('button');
      finishBtn.textContent = 'Finish';
      finishBtn.className = 'finish-btn';
      finishBtn.type = 'button';
      finishBtn.addEventListener('click', () => finishJob(job.id));
      actions.appendChild(finishBtn);
    }

    item.appendChild(actions);
    recentJobs.appendChild(item);
  });
}

async function refreshRecentJobs() {
  const response = await fetch('/api/jobs');
  if (!response.ok) return;
  const data = await response.json();
  renderRecentJobs(data.jobs || []);
}

async function bootstrap() {
  try {
    const resp = await fetch('/api/session');
    if (resp.ok) {
      const data = await resp.json();
      currentUser = data.user || 'user';
    }
  } catch (e) {
    currentUser = 'user';
  }

  createNewJobCard();
  refreshRecentJobs();
  setInterval(refreshRecentJobs, 2000);
}

addJobBtn.addEventListener('click', () => createNewJobCard());
form.addEventListener('submit', submitJobs);
bootstrap();
