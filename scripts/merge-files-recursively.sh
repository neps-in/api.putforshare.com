#!/usr/bin/env bash

set -euo pipefail

# Usage:
# ./combine_recursive.sh mydir
# ./combine_recursive.sh mydir/

if [ $# -eq 0 ]; then
    echo "Usage: $0 <root-directory>"
    exit 1
fi

# Remove trailing slash
ROOT_DIR="${1%/}"

if [ ! -d "$ROOT_DIR" ]; then
    echo "Error: Directory does not exist -> $ROOT_DIR"
    exit 1
fi

combine_directory() {
    local DIR="$1"

    # Directory basename
    local DIR_NAME
    DIR_NAME="$(basename "$DIR")"

    # Output file inside that directory
    local OUTPUT_FILE="$DIR/${DIR_NAME}_combined_output.txt"

    echo "Processing: $DIR"

    # Clear/create output file
    > "$OUTPUT_FILE"

    # Find files only inside current directory (not recursive)
    find "$DIR" \
        -maxdepth 1 \
        -type f \
        \( -name "*.txt" -o -name "*.md" \) \
        ! -name "$(basename "$OUTPUT_FILE")" \
        | sort | while read -r file
    do
        echo "==================================================" >> "$OUTPUT_FILE"
        echo "FILE: $(basename "$file")" >> "$OUTPUT_FILE"
        echo "==================================================" >> "$OUTPUT_FILE"
        echo >> "$OUTPUT_FILE"

        cat "$file" >> "$OUTPUT_FILE"

        echo >> "$OUTPUT_FILE"
        echo >> "$OUTPUT_FILE"
    done
}

export -f combine_directory

# Process all directories recursively
find "$ROOT_DIR" \
    -type d \
    ! -name node_modules \
    ! -name venv \
    ! -name .git \
    | while read -r dir
do
    combine_directory "$dir"
done

echo
echo "Done."
