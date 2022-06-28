const { Client, MessageEmbed, Role, Intents, Message, MessageReaction, User } = require("discord.js");

/** 
 * { color: "DARK_PURPLE", channelId: "808428891718942760", nonToggle: true, emojiRols: [{ emoji: "👑", role: "743864966360334466" }, { emoji: "💎", role: "962353305797951598" }, ]};
 * nonToggle default is false
 */
module.exports = class ReactionMenuHandler {

    /**
     * @param {Client} client 
     * @param {Object} options 
     * @param {Array<{ emoji: String, role: Role }>} options.emojiRols
     * @param {String} options.channelId
     * @param {Boolean} options.nonToggle
     * @param {String} options.title
     * @param {String} options.lineStructure you have two vars to use %%EMOJI and %%ROLENAME
     * @param {String} options.footer
     * @param {import("discord.js").ColorResolvable} options.color
     */
    constructor(client, options) {
        this.client = client;
        this.emojiRols = options.emojiRols || [];
        this.channelId = options.channelId;
        this.reactionToggle = options.nonToggle || false;

        this.embedOptions = {
            title: options.title || "Reaction rols",
            lineStruct: options.lineStructure || "%%EMOJI: %%ROLENAME",
            footer: options.footer || "",
            color: options.color || "BLURPLE"
        };

        this.message = undefined;
        this.#init();

    }

    async #init() {
        const channel = this.client.channels.cache.get(this.channelId);
        const guild = this.client.guilds.cache.get(channel.guild.id);

        this.emojiRols.map(emojiRole => {
            Object({ emoji: emojiRole.emoji, role: guild.roles.cache.get(emojiRole.role) });
        });

        const embed = new MessageEmbed()
            .setTitle(this.embedOptions.title)
            .setColor(this.embedOptions.color)
            .setFooter({ text: this.embedOptions.footer });


        embed.setDescription(this.emojiRols.map(emojiRole => {
            return this.embedOptions.lineStruct.replace("%%EMOJI", emojiRole.emoji).replace("%%ROLENAME", guild.roles.cache.get(emojiRole.role).name).toString();
        }).join("\n"));

        this.message = await channel.send({ embeds: [embed] });
        this.emojiRols.forEach(emojiRole => {
            this.message.react(emojiRole.emoji);
        });
        this.addReactionHandler(this.message);
    }

    /**
     * 
     * @param {Message} message 
     * @returns 
     */
    addReactionHandler(message) {
        message.client.on("messageReactionAdd", (reaction, user) => {
            if (reaction.message.id === message.id && !user.bot) {
                this.handleReaction(reaction, user, true);
            }
        });
        if (this.reactionToggle) return;
        message.client.on("messageReactionRemove", (reaction, user) => {
            if (reaction.message.id === message.id && !user.bot) {
                this.handleReaction(reaction, user, false);
            }
        });
    }

    /**
     * 
     * @param {MessageReaction} reaction 
     * @param {User} user 
     * @param {Boolean} add
     */
    handleReaction(reaction, user, add) {
        const role = reaction.client.guilds.cache.get(reaction.message.guild.id).roles.cache.get(this.emojiRols.find(emojiRole => emojiRole.emoji === reaction.emoji.toString()).role);
        const member = reaction.message.guild.members.cache.get(user.id);
        if (this.reactionToggle) reaction.users.remove(user.id);

        if (!this.reactionToggle) {
            if (add) {
                member.roles.add(role);
            } else if (!add) {
                member.roles.remove(role);
            }
        } else {
            if (member.roles.cache.has(role.id)) {
                member.roles.remove(role);
            } else {
                member.roles.add(role);
            }
        }
    }
};
