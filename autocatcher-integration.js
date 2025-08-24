// Integration module for connecting autocatcher to Discord bot
const axios = require('axios');
const fs = require('fs-extra');
const crypto = require('crypto');

class AutocatcherIntegration {
    constructor(config, client) {
        this.config = config;
        this.client = client;
        this.botApiUrl = config.botApiUrl || 'http://localhost:3000/api';
        this.userHash = this.generateUserHash(client.token);
        this.stats = {
            pokemon_caught: 0,
            legendary_caught: 0,
            mythical_caught: 0,
            ultrabeast_caught: 0,
            shiny_caught: 0,
            messages_spammed: 0
        };
        this.sessionStart = Date.now();
        this.lastUpdate = Date.now();
        
        // Initialize stats from existing data if available
        this.loadExistingStats();
        
        // Set up periodic stats updates
        this.setupPeriodicUpdates();
    }

    generateUserHash(token) {
        return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
    }

    loadExistingStats() {
        try {
            // Load from catches.txt if exists
            if (fs.existsSync('./data/catches.txt')) {
                const catchData = fs.readFileSync('./data/catches.txt', 'utf-8');
                const lines = catchData.split('\n').filter(line => line.trim());
                
                lines.forEach(line => {
                    if (line.includes(this.client.user.username || 'Unknown')) {
                        this.stats.pokemon_caught++;
                        
                        if (line.includes('Shiny')) {
                            this.stats.shiny_caught++;
                        }
                        
                        const rarity = this.extractRarity(line);
                        switch (rarity) {
                            case 'Legendary':
                                this.stats.legendary_caught++;
                                break;
                            case 'Mythical':
                                this.stats.mythical_caught++;
                                break;
                            case 'Ultra Beast':
                                this.stats.ultrabeast_caught++;
                                break;
                        }
                    }
                });
            }
        } catch (error) {
            console.log('Could not load existing stats:', error.message);
        }
    }

    extractRarity(line) {
        if (line.includes('Rarity: Legendary')) return 'Legendary';
        if (line.includes('Rarity: Mythical')) return 'Mythical';
        if (line.includes('Rarity: Ultra Beast')) return 'Ultra Beast';
        return 'Regular';
    }

    async updateStats() {
        try {
            const payload = {
                discord_id: this.config.ownerID[0], // Use first owner ID
                stats: {
                    ...this.stats,
                    session_start: this.sessionStart,
                    last_update: Date.now()
                }
            };

            await axios.post(`${this.botApiUrl}/update-stats`, payload, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            this.lastUpdate = Date.now();
        } catch (error) {
            console.log('Failed to update stats to bot:', error.message);
        }
    }

    async logCatch(pokemonData) {
        try {
            const payload = {
                discord_id: this.config.ownerID[0],
                catch_data: {
                    pokemon_name: pokemonData.name,
                    level: pokemonData.level,
                    iv_percentage: pokemonData.iv,
                    pokemon_number: pokemonData.number,
                    rarity: pokemonData.rarity,
                    is_shiny: pokemonData.isShiny || false
                }
            };

            await axios.post(`${this.botApiUrl}/log-catch`, payload, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Update local stats
            this.stats.pokemon_caught++;
            
            if (pokemonData.isShiny) {
                this.stats.shiny_caught++;
            }
            
            switch (pokemonData.rarity) {
                case 'Legendary':
                    this.stats.legendary_caught++;
                    break;
                case 'Mythical':
                    this.stats.mythical_caught++;
                    break;
                case 'Ultra Beast':
                    this.stats.ultrabeast_caught++;
                    break;
            }

        } catch (error) {
            console.log('Failed to log catch to bot:', error.message);
        }
    }

    incrementMessageCount() {
        this.stats.messages_spammed++;
    }

    setupPeriodicUpdates() {
        // Update stats every 5 minutes
        setInterval(() => {
            this.updateStats();
        }, 5 * 60 * 1000);

        // Initial update after 30 seconds
        setTimeout(() => {
            this.updateStats();
        }, 30000);
    }

    async ensureRegistration() {
        try {
            // Try to register the user if not already registered
            const payload = {
                discord_id: this.config.ownerID[0],
                username: this.client.user.username,
                token_hash: this.userHash,
                guild_id: this.config.tokens[0]?.guildId || 'unknown'
            };

            await axios.post(`${this.botApiUrl}/register-autocatcher`, payload, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        } catch (error) {
            // Registration might fail if already exists, that's okay
            console.log('Registration check:', error.response?.status === 409 ? 'Already registered' : error.message);
        }
    }

    // Enhanced logging function
    async logToFile(data) {
        try {
            const logEntry = `Account: ${this.client.user.username} || Name: ${data.name} || Level: ${data.level} || IV: ${data.iv}% || Number: ${data.number} || Rarity: ${data.rarity}${data.isShiny ? ' || Shiny: Yes' : ''}\n`;
            
            await fs.ensureDir('./data');
            await fs.appendFile('./data/catches.txt', logEntry);
            
            // Also log the catch to bot
            await this.logCatch(data);
            
        } catch (error) {
            console.error('Failed to log to file:', error);
        }
    }
}

module.exports = AutocatcherIntegration;