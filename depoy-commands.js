import yaml from 'js-yaml';
import fs from 'fs';
import { REST, Routes } from 'discord.js';

// Load configuration from config.yaml
const config = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));

// Extract Discord token and client ID from the configuration
const DISCORD_TOKEN = config.discord.token;
const CLIENT_ID = config.discord.client_id;

const commands = [
    {
        name: 'downloadmp3',
        description: 'Download a YouTube video as MP3',
        options: [
            {
                name: 'url',
                type: 3, // STRING
                description: 'The YouTube URL',
                required: true,
            },
        ],
    },
    {
        name: 'downloadmp4',
        description: 'Download a YouTube video as MP4',
        options: [
            {
                name: 'url',
                type: 3, // STRING
                description: 'The YouTube URL',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();