import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, 'public', 'version.json');
const srcPath = path.join(__dirname, 'src', 'version.json');

let currentVersion = 1;
if (fs.existsSync(publicPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
        currentVersion = data.version + 1;
    } catch (e) {
        console.error('Error reading existing version.json', e);
    }
}

const versionData = { version: currentVersion };
const jsonString = JSON.stringify(versionData, null, 2);

// Ensure public dir exists just in case
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
}

fs.writeFileSync(publicPath, jsonString);
fs.writeFileSync(srcPath, jsonString);

console.log(`[Version Updater] App version incremented to: ${currentVersion}`);
