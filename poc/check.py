with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

print("tool-btn lines:")
for line in c.split('\n'):
    if 'tool-btn' in line:
        print(line.strip())

print("\npill-dark lines:")
for line in c.split('\n'):
    if 'pill-dark' in line and 'close' in line:
        print(line.strip())

print("\nsubtask-text-wrapper lines:")
for line in c.split('\n'):
    if 'subtask-text-wrapper' in line:
        print(line.strip())
