"""Cover image processing pipeline.

Sub-modules:
    storage.py     - Async Bunny upload + CDN URL builder
    fetcher.py     - Download + validate raw cover bytes from source candidates
    processor.py   - Pillow resize/EXIF-strip/format-convert
    placeholder.py - Default cover URL when sources miss
    pipeline.py    - Orchestrator that ties fetch -> process -> upload
"""
