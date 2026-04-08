# Task & Link Manager - Chrome Extension

A visually stunning and functionally robust Chrome extension designed to help you organize your daily tasks and associate them with multiple web resources.

![Task Manager Extension](https://raw.githubusercontent.com/username/repo/main/screenshots/extension-ui.png) <!-- Placeholder for when user adds images -->

## 🌟 Features

-   **Offline-First Architecture**: Your tasks are saved locally in your browser's storage, ensuring lightning-fast access even without an internet connection.
-   **Bi-directional Sync**: A specialized synchronization engine that merges local data with a backend server using timestamp-based conflict resolution.
-   **Task Link Integration**: Attach multiple URLs to a single task. Perfect for research, shopping lists, or project resources.
-   **Quick Add Capturing**: Instantly add your currently active browser tab as a link to any existing task with a single click.
-   **Priority Management**: Categorize tasks by priority (High, Medium, Low) with beautiful, color-coded badges.
-   **Modern Aesthetics**: Built with a "premium-first" design philosophy using the Inter typeface, smooth transitions, and a curated HSL color palette.

## 🛠️ Technical Stack

-   **Manifest V3**: Compliant with the latest Chrome extension standards.
-   **Vanilla JavaScript**: No heavy frameworks, optimized for performance.
-   **CSS3 Custom Properties**: A flexible design system with support for smooth micro-animations.
-   **Chrome Storage API**: Uses `chrome.storage.local` for persistence.

## 🚀 Installation

1.  Clone this repository or download the source code.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right corner).
4.  Click **Load unpacked** and select the `task-link-manager-extension` directory.
5.  Pin the extension to your toolbar for easy access!

## 🔄 Synchronization

To use the sync feature, ensure you have the [Task Link Manager Backend](../task-link-manager-backend) running on `http://localhost:3000`.

1.  Click the **Sync** icon in the extension popup.
2.  The extension will negotiate with the server to find the latest version of each task.
3.  Newer local changes are pushed to the server, and newer server changes are pulled to your browser.

## 📄 License

This project is licensed under the ISC License.
