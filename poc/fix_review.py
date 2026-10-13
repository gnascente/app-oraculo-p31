import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Try again for the subtask wrapper
content = re.sub(
    r'<div class="subtask-text-wrapper" onclick="App\.toggleTaskLogs\(\'\$\{t\.id\}\'\)">\s*<i class="material-icons action-icon" style="font-size:24px;" id="task-icon-\$\{t\.id\}">\$\{taskIcon\}</i>',
    r'<div class="subtask-text-wrapper" onclick="App.toggleTaskLogs(\'${t.id}\')" role="button" tabindex="0" aria-label="Alternar Logs da Tarefa">\n                                    <i class="material-icons action-icon" style="font-size:24px;" id="task-icon-${t.id}">${taskIcon}</i>',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
