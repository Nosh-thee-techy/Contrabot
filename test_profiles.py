import json
import os
import sys

# Ensure current directory is in path so we can import engine
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from engine.safety_screen import safety_screen
from engine.scorer import score_methods

# Locate sample_profiles.json
json_path = os.path.join(current_dir, 'reproducibility', 'sample_profiles.json')
if not os.path.exists(json_path):
    json_path = 'sample_profiles.json'

with open(json_path) as f:
    profiles = json.load(f)

for i, p in enumerate(profiles):
    print(f"\n--- Profile {i+1} ---")
    eliminations = safety_screen(p['input'])
    scores = score_methods(p['input'], eliminations)
    print(f"Eliminated: {[e['method'] for e in eliminations]}")
    print(f"Top recommendations: {scores[:3]}")
    print(f"Expected: {p['expected_output']['top_recommendations']}")
