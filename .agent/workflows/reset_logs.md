---
description: Reset debug and error logs
---

To reset the `debug.log` and `browser-error.log` files, you can use the `/__reset_logs` endpoint if the dev server is running.

```bash
curl -X POST http://localhost:5174/DanmakuPlayer/__reset_logs
```

If the server is not running or the port is different, verify the port or manually truncate the files:

```bash
echo "" > debug.log
echo "" > browser-error.log
```
