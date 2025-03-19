import yaml from 'js-yaml';
import fs from 'fs';
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { exec } from 'child_process';
import path from 'path';
import http from 'http';
const config = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));
const DISCORD_TOKEN = config.discord.token;
const CLIENT_ID = config.discord.client_id;
const hostURL = config.host.url
const hostPort = config.host.port
const tthMinutes = config.host.ttl
const ttlMinutes = config.files.ttl
const outputDir = config.files.outputDir
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const inUseFiles = new Set(); // Set to track files currently being processed
const hostedFiles = new Map(); // Map to track hosted files and their paths

// Runs deploy-commands.js as a child process
async function deployCommands() {
    exec('node depoy-commands.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing deploy-commands.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
    });
}

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Periodic cleanup process to check old files
setInterval(() => {
    const now = Date.now();
    const ttl = 60 * 1000 * ttlMinutes;

    fs.readdir(outputDir, (err, files) => {
        if (err) {
            console.error(`Error reading directory for cleanup: ${err.message}`);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(outputDir, file);

            // Skip files that are currently being processed
            if (inUseFiles.has(filePath)) {
                return;
            }

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Error getting stats for file: ${err.message}`);
                    return;
                }

                // Check if the file is older than TTL
                if (now - stats.birthtimeMs > ttl) {
                    console.log(`File past ttl (${ttlMinutes} Minutes): ${filePath}`);
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`Error deleting file: ${err.message}`);
                        } else {
                            console.log(`Deleted old file: ${filePath}`);
                        }
                    });
                }
            });
        });
    });
}, 1000 * 60); // Run every minute

// Create a single HTTP server to serve files
const server = http.createServer((req, res) => {
    const requestedFile = decodeURIComponent(req.url.slice(1)); // Remove leading '/' and decode
    const filePath = hostedFiles.get(requestedFile);

    if (filePath && fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${requestedFile}"`,
        });
        fileStream.pipe(res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
    }
});

// Start the server on a single port
server.listen(hostPort, () => {
    console.log(`File hosting server running on ${hostURL}:${hostPort}`);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Function to handle file download and response
async function handleDownload(interaction, format, url, videoId) {
    const command = `yt-dlp -k -o "${outputDir}/%(title)s [%(id)s].${format}" -f ${
        format === 'mp3' ? 'bestaudio' : 'bestvideo+bestaudio'
    } --audio-format mp3 --audio-quality 0 "${url}"`;

    await interaction.reply(`Downloading ${format.toUpperCase()}...`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return interaction.followUp('An error occurred while processing your request.');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);

        // Locate the downloaded file
        fs.readdir(outputDir, async (err, files) => {
            if (err) {
                console.error(`Error reading directory: ${err.message}`);
                return interaction.followUp('An error occurred while locating the downloaded file.');
            }

            // Find the file that matches the video ID
            const downloadedFile = files.find(file => file.includes(`[${videoId}].${format}`));
            if (downloadedFile) {
                const filePath = path.join(outputDir, downloadedFile);

                // Mark the file as "in use"
                inUseFiles.add(filePath);

                const fileSizeInBytes = fs.statSync(filePath).size;

                // Determine max file size based on server boost level
                let maxFileSize = 8 * 1024 * 1024; // Default: 8 MB
                if (interaction.guild) {
                    switch (interaction.guild.premiumTier) {
                        case 2: // Level 2 boost
                            maxFileSize = 50 * 1024 * 1024; // 50 MB
                            break;
                        case 3: // Level 3 boost
                            maxFileSize = 100 * 1024 * 1024; // 100 MB
                            break;
                    }
                }

                if (fileSizeInBytes > maxFileSize) {
                    // Host the file temporarily
                    const tth = 60 * 1000 * tthMinutes;
                    const expirationTime = Math.floor((Date.now() + tth) / 1000);
                    try {
                        const downloadLink = `${hostURL}:${hostPort}/${encodeURIComponent(downloadedFile)}`;
                        hostedFiles.set(downloadedFile, filePath); // Map the file name to its path

                        interaction.followUp(
                            `The file is too large to send via Discord.\nYou can download it [here](${downloadLink}).\nThis link will expire <t:${expirationTime}:R>.`
                        );

                        // Automatically remove the file from the map after 5 minutes
                        setTimeout(() => {
                            hostedFiles.delete(downloadedFile);
                            console.log(`File ${downloadedFile} is no longer hosted.`);
                            inUseFiles.delete(filePath); // Remove from "in use" set
                        }, tth);
                    } catch (error) {
                        console.error(`Error hosting file: ${error.message}`);
                        interaction.followUp('An error occurred while hosting the file.');
                        inUseFiles.delete(filePath);
                    }
                } else {
                    // Send the file via Discord
                    const attachment = new AttachmentBuilder(filePath);
                    interaction.followUp({
                        content: `${format.toUpperCase()} download complete!`,
                        files: [attachment],
                    }).then(() => {
                        // Remove the file from "in use" after sending
                        inUseFiles.delete(filePath);
                    });
                }
            } else {
                interaction.followUp(`${format.toUpperCase()} download complete, but the file could not be located.`);
            }
        });
    });
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'downloadmp3' || commandName === 'downloadmp4') {
        const url = options.getString('url');
        const videoId = url.split('v=')[1]; // Extract video ID from the URL
        const format = commandName === 'downloadmp3' ? 'mp3' : 'mp4';

        // Call the function to handle the download
        handleDownload(interaction, format, url, videoId);
    }
});

// Deploy commands and log in the bot
await deployCommands();
client.login(DISCORD_TOKEN);