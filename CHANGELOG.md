# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- **A prompt a day**, derived from the date so every copy shows the same prompt without a server.
- A **drawing pad**, stored as strokes rather than as an image.
- **One doodle per date**: a second is refused until you confirm the replacement, and the refusal says so.
- **Yesterday's doodle one tap away**, with the gap in days named.
- A **streak** that counts consecutive days actually drawn; a missed day is a gap, never filled by the
  nearest drawing.
- A **share card** with the prompt, the date and the drawing — and nothing that ranks it.
- Refusals: a doodle with no strokes (with or without a replacement), a bad date.
- An unreadable book is reported and offered for export, **never** replaced with an empty one — that would
  look like a lost streak.
- A failed save says **NOT SAVED** and leaves the drawing on screen unchanged.
- PWA shell, CI (51 engine assertions + 18 in jsdom + page smoke), and the app-builder pipeline pinned to
  the canonical SHA for the EXE/APK/Linux release.

### Not built
- A global reveal and accounts: there is no server, and the prompt is derived from the date instead.
