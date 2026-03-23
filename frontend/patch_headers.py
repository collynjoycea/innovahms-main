"""
Patch all staff headers:
1. Import ShiftClockWidget + useStaffSession
2. Read real staff name from localStorage
3. Replace hardcoded 'Collyn Fernandez' with real name
4. Add ShiftClockWidget before the profile dropdown
"""
import os, re

HEADERS = [
    r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\components\FrontDesktopHeader.jsx',
    r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\components\InventoryHeader.jsx',
    r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\components\HousekeepingMainteHeader.jsx',
    r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\components\HrPayrollStaffHeader.jsx',
    r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\components\HotelManagerHeader.jsx',
]

ROLE_LABELS = {
    'FrontDesktopHeader':       'FRONT DESK',
    'InventoryHeader':          'INVENTORY DEPT',
    'HousekeepingMainteHeader': 'HOUSEKEEPING',
    'HrPayrollStaffHeader':     'HR & PAYROLL',
    'HotelManagerHeader':       'HOTEL MANAGER',
}

for path in HEADERS:
    fname = os.path.basename(path).replace('.jsx','')
    role_label = ROLE_LABELS.get(fname, 'STAFF')

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Add ShiftClockWidget import after the last import line
    if 'ShiftClockWidget' not in content:
        lines = content.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import = i
        lines.insert(last_import + 1, "import ShiftClockWidget from './ShiftClockWidget';")
        lines.insert(last_import + 2, "import useStaffSession from '../hooks/useStaffSession';")
        content = '\n'.join(lines)

    # 2. Add hook call inside the component (after first useState)
    if 'useStaffSession' not in content or 'staffUser' not in content:
        # Find the component function body start
        content = re.sub(
            r'(const \w+ = \(\{ isDarkMode[^)]*\}\) => \{)',
            r'\1\n  const { firstName, lastName, role } = useStaffSession();',
            content, count=1
        )

    # 3. Replace hardcoded name in JSX with real name
    content = content.replace(
        '>Collyn Fernandez<',
        '>{firstName || lastName ? `${firstName} ${lastName}`.trim() : \'Staff\'}<'
    )
    # Also handle the initials avatar (CF -> dynamic)
    content = content.replace(
        '>CF<',
        '>{(firstName?.[0] || \'S\') + (lastName?.[0] || \'\')}<'
    )

    # 4. Add ShiftClockWidget before the profile dropdown div
    # Find the pattern: <div className="relative" ref={menuRef}>
    if '<ShiftClockWidget' not in content:
        content = content.replace(
            '<div className="relative" ref={menuRef}>',
            '<ShiftClockWidget isDarkMode={isDarkMode} />\n\n        <div className="relative" ref={menuRef}>',
            1  # only first occurrence
        )

    # 5. Fix role label in profile dropdown
    content = content.replace(
        f'>{role_label}<',
        '>{role || \'' + role_label + '\'}<'
    )

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'PATCHED: {fname}')
    else:
        print(f'NO CHANGE: {fname}')

print('\nDone.')
