f=open('app.py','rb')
d=f.read()
f.close()
lines=d.split(b'\n')
for i,l in enumerate(lines):
    if b'def owner_login' in l:
        for j in range(i, min(i+45, len(lines))):
            print(j+1, lines[j].decode('latin-1', errors='replace').rstrip())
        break
