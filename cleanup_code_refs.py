#!/usr/bin/env python3
"""Remove all Daimo and ePayco code references from bot files"""

import re
import os

files_to_clean = [
    'src/bot/helpers/subscriptionHelpers.js',
    'src/bot/handlers/admin/planManager.js',
    'src/bot/handlers/admin.js',
    'src/bot/handlers/aiChat.js',
    'src/utils/membershipManager.js',
    'src/services/planService.js',
    'src/config/env.js',
    'src/config/sentry.js',
]

for filepath in files_to_clean:
    if not os.path.exists(filepath):
        print(f"⏭️  Skip {filepath} (not found)")
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Remove require statements
    content = re.sub(r'const epayco = require\(["\'].*?epayco.*?["\']\);\n?', '', content)
    content = re.sub(r'const daimo = require\(["\'].*?daimo.*?["\']\);\n?', '', content)
    
    # Remove epayco/daimo from payment method arrays and validations
    content = re.sub(r"'epayco',?\s*", '', content)
    content = re.sub(r'"epayco",?\s*', '', content)
    content = re.sub(r"'daimo',?\s*", '', content)
    content = re.sub(r'"daimo",?\s*', '', content)
    
    # Fix array syntax issues (remove trailing commas in arrays)
    content = re.sub(r'\[\s*,', '[', content)
    content = re.sub(r',\s*\]', ']', content)
    content = re.sub(r',\s*,', ',', content)
    
    # Remove ePayco/Daimo environment variables
    content = re.sub(r"'EPAYCO_[^']*',?\n?", '', content)
    content = re.sub(r'"EPAYCO_[^"]*",?\n?', '', content)
    content = re.sub(r"'DAIMO_[^']*',?\n?", '', content)
    content = re.sub(r'"DAIMO_[^"]*",?\n?', '', content)
    
    # Remove epayco/daimo mentions from comments
    content = re.sub(r'//.*?(epayco|daimo|ePayco|Daimo).*?\n', '// Payment methods removed\n', content, flags=re.IGNORECASE)
    
    # Save only if changed
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ Cleaned {filepath}")
    else:
        print(f"⏭️  No changes needed in {filepath}")

print("\n✅ Code reference cleanup complete!")
