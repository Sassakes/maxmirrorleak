const bot = require(`${__dirname}/config/Bot.json`);
const { WebhookClient, Client } = require('discord.js-selfbot-v13');

async function check_channels(path) {
    delete require.cache[require.resolve(path)];
    return require(path);
}

async function check_message(msg, type_) {
    const data = {};
    
    if (type_) {
        data['username'] = String(msg.author.username).substring(0, 30);
        data['avatarURL'] = msg.author.displayAvatarURL({ dynamic: false, format: 'jpg' });
    }

    const format = await check_channels(`${__dirname}/config/Format.json`);
    if (msg.content) {
        data['content'] = String(msg.content).substring(0, 1950);
        for (const text of Object.keys(format)) {
            try {
                if (String(data['content']).indexOf(text) != -1) {
                    const info = format[text];
                    if (info == 'cancel') {
                        return false;
                    } else {
                        data['content'] = String(data['content']).replaceAll(text, info);
                    }
                }
            } catch (error) { }
        }
    }
    if (msg.embeds.length) data['embeds'] = msg.embeds;
    if (msg.attachments.size) {
        const send_list = [];
        msg.attachments.forEach(file => {
            send_list.push(file.url);
        });
        data['files'] = send_list;
    }

    return data;
}
async function check_data(msg) {
    if (msg.content) return true;
    if (msg.embeds.length) return true;
    if (msg.attachments.size) return true;
    return false;
}

async function webhook(url, data) {
    try {
        const hook = new WebhookClient({ url: url });
        await hook.send(data);
        hook.destroy();
    } catch (error) {
        console.error(`  [ WEBHOOK ] Error: ${error.message}`);
    }
}

/* BOT - DISCORD */
const client = new Client({
    restGlobalRateLimit: 50,
    sweepers: {
        messages: { interval: 60, lifetime: 60 }
    },
    intents: ['GUILD_MESSAGES'],
    retryLimit: 2,
    partials: ['USER', 'GUILD_MEMBER', 'MESSAGE']
});

client.once('ready', () => {
    console.log(`  [ DISCORD ] Logged in as ${client.user.tag}!`);
    const d = new Date();
    console.log(`  [ DATE ] ${d.toString()}`);
});

client.on('messageCreate', async (m) => {
    const data = await check_data(m);
    if (!data) return;
	if (!m.channel) return;
    if (!m.channel.guild) return;
    
    const chn = await check_channels(`${__dirname}/config/Bot.json`);
    if (Object.keys(chn.channels).includes(m.channel.id)) {
        if (String(chn.channels[m.channel.id]).startsWith('https://discord.com/api/webhooks/')) {
            const msg = await check_message(m, chn.info);
            if (msg) {
                await webhook(chn.channels[m.channel.id], msg);
            }
        }
    }
});

client.login(bot.token);