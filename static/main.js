const newJobsList = document.getElementById('newJobsList');
const template = document.getElementById('newJobTemplate');
const recentJobs = document.getElementById('recentJobs');
const addJobBtn = document.getElementById('addJobBtn');
const form = document.getElementById('newJobsForm');

function createNewJobCard(prefill = {}) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelectorAll('input').forEach((input) => {
    if (prefill[input.name]) input.value = prefill[input.name];
  });

  node.querySelector('.remove-btn').addEventListener('click', () => {
    node.remove();
    if (!newJobsList.children.length) createNewJobCard();
  });

  newJobsList.appendChild(node);
}

function collectNewJobs() {
  return Array.from(newJobsList.querySelectorAll('.job-card')).map((card) => {
    const data = {};
    card.querySelectorAll('input').forEach((input) => {
      data[input.name] = input.value.trim();
    });
    return data;
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
    alert(`提交失败: ${text}`);
    return;
  }

  alert('提交成功');
  newJobsList.innerHTML = '';
  createNewJobCard();
  await refreshRecentJobs();
}

async function stopJob(jobId) {
  const yes = window.confirm('是否停止该 Job?');
  if (!yes) return;

  const response = await fetch(`/api/jobs/${jobId}/stop`, { method: 'POST' });
  if (!response.ok) {
    alert('停止失败');
    return;
  }
  await refreshRecentJobs();
}

function renderRecentJobs(jobs) {
  recentJobs.innerHTML = '';
  if (!jobs.length) {
    recentJobs.textContent = '暂无任务';
    return;
  }

  jobs.forEach((job) => {
    const item = document.createElement('div');
    item.className = 'recent-card';

    const payload = job.payload || {};
    item.innerHTML = `
      <div><strong>Job ID:</strong> ${job.id}</div>
      <div><strong>Bitfile:</strong> ${payload.bitfile || ''}</div>
      <div><strong>Binfile:</strong> ${payload.binfile || ''}</div>
      <div><strong>Log Path:</strong> ${payload.log_path || ''}</div>
      <div><strong>OpenODC:</strong> ${payload.openodc_path || ''}</div>
      <div><strong>UARTs:</strong> ${payload.uart1 || '-'} / ${payload.uart2 || '-'} / ${payload.uart3 || '-'} / ${payload.uart4 || '-'}</div>
      <div><strong>Status:</strong> <span class="status ${job.status}">${job.status}</span></div>
      <div class="meta"><strong>提交时间:</strong> ${job.submit_time || '-'}</div>
      <div class="meta"><strong>结束时间:</strong> ${job.end_time || '-'}</div>
      <div class="meta"><strong>信息:</strong> ${job.message || '-'}</div>
    `;

    const actions = document.createElement('div');
    actions.style.marginTop = '8px';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy 到 New Jobs';
    copyBtn.className = 'copy-btn';
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', () => createNewJobCard(payload));
    actions.appendChild(copyBtn);

    if (job.status === 'Runing') {
      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'Stop';
      stopBtn.className = 'stop-btn';
      stopBtn.type = 'button';
      stopBtn.addEventListener('click', () => stopJob(job.id));
      actions.appendChild(stopBtn);
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

addJobBtn.addEventListener('click', () => createNewJobCard());
form.addEventListener('submit', submitJobs);

createNewJobCard();
refreshRecentJobs();
setInterval(refreshRecentJobs, 2000);
