# GSC Bulk URL Remover

<div align="center">

![GSC Bulk Remover Logo](img/icon-128.png)

A Chrome extension for efficiently removing URLs in bulk from Google Search Console.

[![Version](https://img.shields.io/badge/version-1.0-green.svg)](https://github.com/saur8bh/gsc-bulk-remover/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## 🚀 Features

- **Bulk URL Processing**: Remove multiple URLs from Google Search Console at once
- **Two Removal Types**: 
  - Temporary Removal
  - Cache Removal
- **File Upload Support**: Import URLs from CSV or TXT files
- **Results Download**: Save processed URLs list with success/failure status
- **User-Friendly Interface**: Modern and intuitive design
- **Progress Tracking**: Real-time feedback on URL processing

## 📋 Requirements

- Google Chrome Browser (Version 88 or higher)
- Access to Google Search Console
- URLs must start with http:// or https://

## 🛠️ Installation

### ~~From Chrome Web Store~~
~~Coming soon to Chrome Web Store!~~

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## 💡 How to Use

1. **Open Google Search Console**
   - Navigate to your property in Google Search Console
   - Go to the "Removals" section

2. **Launch the Extension**
   - Click the extension icon in your Chrome toolbar
   - The interface will appear as a popup

3. **Choose Removal Type**
   - Select either "Temporary" or "Cache" removal

4. **Add URLs**
   - Either paste URLs directly (one per line)
   - Or upload a CSV/TXT file containing URLs
   - For optimal performance, process up to 100 URLs at a time

5. **Start Processing**
   - Click the "Start Process" button
   - Monitor the progress in real-time
   - Optionally enable "Save Results" to download a report

## ⚙️ Best Practices

- **URL Format**: Ensure all URLs start with http:// or https://
- **Batch Size**: Process 100 URLs at a time for optimal performance
- **File Format**: When uploading, use plain text files with one URL per line
- **Monitoring**: Keep the browser tab active during processing
- **Large Lists**: Split lists of over 500 URLs into multiple batches

## 🔍 Troubleshooting

Common issues and solutions:

1. **URLs Not Processing**
   - Ensure URLs start with http:// or https://
   - Check if you're logged into Google Search Console
   - Verify you have proper access rights

2. **Extension Not Responding**
   - Refresh the Google Search Console page
   - Restart the Chrome browser
   - Reinstall the extension

3. **File Upload Issues**
   - Ensure file is in correct format (CSV or TXT)
   - Check if URLs are properly formatted
   - Try copying and pasting URLs directly

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**@saur8bh**
- GitHub: [@saur8bh](https://github.com/saur8bh)

## 🙏 Acknowledgments

- Thanks to all contributors who have helped make this extension better
- Icons and design elements from various open-source projects

---

<div align="center">
Made with ♥ by <a href="https://github.com/saur8bh">@saur8bh</a>
</div>
