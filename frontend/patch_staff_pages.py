"""
Patch all frontdesktop staff pages to use useStaffSession hook.
"""
import os, re

BASE = r'c:\Users\collyn fernandez\OneDrive\Documents\innovahms-main\frontend\src\pages\Staff\frontdesktop'
HOOK_IMPORT = "import useStaffSession from '../../../hooks/useStaffSession';\n"

# Map: filename -> list of (old_fetch_url, new_fetch_url)
# We replace bare '/api/staff/...' with '/api/staff/...${qs}'
# and add the hook call after the component function declaration

files_to_patch = {
    'AllReservation.jsx': [
        ("fetch('/api/staff/reservations')", "fetch(`/api/staff/reservations${qs}`)"),
    ],
    'CheckIn.jsx': [
        ("fetch('/api/staff/reservations')", "fetch(`/api/staff/reservations${qs}`)"),
        ("fetch('/api/staff/overdue-count')", "fetch(`/api/staff/overdue-count${qs}`)"),
    ],
    'CheckOut.jsx': [
        ("fetch('/api/staff/checkout-queue')", "fetch(`/api/staff/checkout-queue${qs}`)"),
        ("fetch('/api/staff/overdue-checkout-count')", "fetch(`/api/staff/overdue-checkout-count${qs}`)"),
    ],
    'Extend.jsx': [
        ("fetch('/api/staff/checkout-queue')", "fetch(`/api/staff/checkout-queue${qs}`)"),
    ],
    'GuestProfile.jsx': [
        ("fetch('/api/staff/guests')", "fetch(`/api/staff/guests${qs}`)"),
    ],
    'LoyaltyPoints.jsx': [
        ("fetch('/api/staff/loyalty')", "fetch(`/api/staff/loyalty${qs}`)"),
    ],
    'RoomMaspAssign.jsx': [
        ("fetch('/api/staff/room-map')", "fetch(`/api/staff/room-map${qs}`)"),
        ("fetch('/api/staff/reservations')", "fetch(`/api/staff/reservations${qs}`)"),
    ],
    'StaffDashboard.jsx': [
        ("fetch('/api/staff/dashboard')", "fetch(`/api/staff/dashboard${qs}`)"),
    ],
    'NewReservation.jsx': [
        ("fetch('/api/staff/reservations')", "fetch(`/api/staff/reservations${qs}`)"),
        ("fetch('/api/staff/overdue-count')", "fetch(`/api/staff/overdue-count${qs}`)"),
    ],
    'MyShiftProfile.jsx': [
        ("fetch(`/api/staff/shift-status/${staffId}`)", "fetch(`/api/staff/shift-status/${staffId}`)"),
    ],
}

for filename, replacements in files_to_patch.items():
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f'SKIP (not found): {filename}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Add hook import if not already there
    if 'useStaffSession' not in content:
        # Insert after the last import line
        lines = content.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import = i
        lines.insert(last_import + 1, HOOK_IMPORT.rstrip())
        content = '\n'.join(lines)

    # 2. Add hook call inside the component function
    if 'useStaffSession' not in content or 'const { qs' not in content:
        # Find the first useState or useCallback or useOutletContext call and insert before it
        insert_patterns = [
            'const { isDarkMode }',
            'const [loading',
            'const [data',
            'const [guests',
            'const [rooms',
            'const [members',
            'const [reservations',
            'const [stays',
            'const [shift',
        ]
        for pat in insert_patterns:
            if pat in content:
                content = content.replace(
                    pat,
                    f"const {{ qs, hotelId, firstName, staffId }} = useStaffSession();\n  {pat}",
                    1
                )
                break

    # 3. Replace fetch URLs
    for old_url, new_url in replacements:
        if old_url in content:
            content = content.replace(old_url, new_url)
            print(f'  {filename}: replaced {old_url!r}')
        else:
            print(f'  {filename}: NOT FOUND {old_url!r}')

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  {filename}: SAVED')
    else:
        print(f'  {filename}: no changes')

print('\nAll done.')
