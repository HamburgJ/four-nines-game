"""Simple script to replace '0.' with '.' in the JSON file and remove nested objects with key '1'."""

import json

def remove_nested_ones(data):
    # If data is a dict, process each value
    if isinstance(data, dict):
        # For each top-level digit key (e.g., "1", "2", "3", etc.)
        for digit_key in data:
            # If this is a digit's object (second level)
            if isinstance(data[digit_key], dict):
                # Remove key "1" if it exists
                data[digit_key] = {k: v for k, v in data[digit_key].items() if k != "1"}
                
        # Process all values recursively
        for key in data:
            data[key] = remove_nested_ones(data[key])
    return data

# Read and parse the JSON file
with open('puzzles/all_puzzles_with_hints.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Remove nested ones
data = remove_nested_ones(data)

# Convert back to string to do the decimal replacement
content = json.dumps(data, indent=2)
content = content.replace('0.', '.')

# Write back to file
with open('puzzles/all_puzzles_with_hints.json', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully processed the file") 