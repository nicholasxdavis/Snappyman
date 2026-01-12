<h1 align="center">Snappyman</h1>

<p align="center">
  A robust and simple pixel-art styled screen capture tool built with Electron
</p>

<p align="center">
  <a href="https://github.com/nicholasxdavis/snappyman">
    <img src="https://github.com/nicholasxdavis/Snappyman/blob/main/assets/preview.png?raw=true" alt="Preview">
  </a>
</p>

## Features

 - **Pixel-Perfect Selection**: Draw your capture area directly on screen with a retro-styled crosshair.
 - **Precision Resizing**: Adjust your selection using corner handles before committing to a snap.
 - **Lock Mode**: Lock your selection to prevent accidental changes while keeping the capture area visible.
 - **Global Hotkeys**: Trigger a snapshot instantly with `Ctrl+Shift+S` or reset your selection with `Ctrl+Shift+X`.
 - **Smart Saving**: Screenshots are automatically timestamped and saved to a dedicated "Snappyman" folder in your Pictures directory.
 - **Visual Feedback**: Screen-flash effects and status notifications confirm when your capture is saved to disk.

## Tech Stack

 - **Electron**: Powers the cross-platform desktop environment and global shortcut integration.
 - **JavaScript/HTML/CSS**: Handles the transparent overlay and selection logic.
 - **Node.js**: Manages file system operations and screenshot encoding.

## Getting Started

### Prerequisites

 - [Node.js](https://nodejs.org/) installed on your machine.
 - [npm](https://www.npmjs.com/) (comes with Node.js).

### Running from source

 1. Clone this repository:
    ```bash
    git clone [https://github.com/nicholasxdavis/snappyman](https://github.com/nicholasxdavis/snappyman)
    ```
 2. Navigate to the project directory:
    ```bash
    cd snappyman
    ```
 3. Install dependencies:
    ```bash
    npm install
    ```
 4. Start the application:
    ```bash
    npm start
    ```

## Usage

 - **Toggle ON/OFF**: Use the main toolbar to enable or disable the selection overlay.
 - **Select**: Click and drag on the screen to define your capture area.
 - **Snap**: Click the "SNAP" button or use the hotkey to save the cropped area as a PNG.
 - **Open Folder**: Use the folder icon in the UI to jump directly to your saved captures.

## Credits and tools used

 - [Electron](https://www.electronjs.org/)
 - The [m5x7](https://managore.itch.io/m5x7) and [m3x6](https://managore.itch.io/m3x6) fonts by Daniel Linssen
 - [MIT License](LICENSE) — Copyright (c) 2026 nic x
