# Job Console (CentOS 7 Friendly)

这是一个最小可运行的前后端示例：

- 前端：网页提交 Job（New Jobs）
- 后端：FastAPI 接收并执行 Job
- Recent Jobs：显示运行中/已完成任务，支持 Stop、Copy

## 功能对应

1. Job 提交：支持在 New Jobs 填写并提交。
2. 页面包含 New Jobs 与 Recent Jobs。
3. New Jobs 条目支持 Bitfile、Binfile。
4. 条目支持工具链配置：UART1~UART4、OpenODC 路径。
5. 条目支持 log_path。
6. New Jobs 支持新增条目。
7. Submit 后批量提交到后端执行。
8. 提交后 Recent Jobs 显示状态。
9. Recent Jobs 显示 Runing / Finish（以及 Stopped/Failed）。
10. Runing 条目支持 Stop，并二次确认。
11. Stop 后后端终止对应进程。
12. Recent Jobs 记录提交时间与结束时间。
13. Recent Jobs 支持 Copy 到 New Jobs。

## 本地运行

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000
```

访问：`http://127.0.0.1:8000`

## API

- `POST /api/jobs`：提交 jobs
- `GET /api/jobs`：查询 recent jobs
- `POST /api/jobs/{job_id}/stop`：停止运行中的 job
