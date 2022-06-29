const { Client, MessageEmbed, MessageActionRow, MessageButton, Message, MessageSelectMenu, ButtonInteraction, MessageComponentInteraction } = require("discord.js");
const discordTranscripts = require('discord-html-transcripts');

module.exports = class TicketMenuHandler {
    #ticketId = String;
    /**
     * @param {Client} client 
     * @param {Object} options
     * @param {String} options.channelId
     * @param {String} options.supportRole
     * @param {String} options.chefRole 
     */
    constructor(client, options) {
        this.client = client;
        this.channelId = options.channelId;
        this.#ticketId = Math.random().toString(5).substring(2, 7);
        this.supportRole = options.supportRole;
        this.chefRole = options.chefRole;

        this.selectionOptions = [
            { label: "Entbannung", value: "unban", emoji: "🔨", description: "Stelle einen Antrag auf Entbannung" },
            { label: "Spenden", value: "donate", emoji: "💸", description: "Spende Geld uns Geld", ticketText: "Das Spenden Team wird sich gleich um dich kümmern!\nBitte halte dein daten bereit." },
            { label: "Bewerbung", value: "application", emoji: "📝", description: "Bewerbe dich für ein Team" },
            { label: "Support", value: "support", emoji: "🎫", description: "Bewerbe dich für ein Team" }
        ];

        this.#init();
        this.listenOnOldTickets();
    }

    async #init() {
        const channel = this.client.channels.cache.get(this.channelId);
        let message;
        const ticketEmbed = new MessageEmbed()
            .setColor("GREEN")
            .setTitle("Tickets")
            .setDescription("Um ein Ticket zu erstellen, reagieren Sie mit 📨");

        const row = new MessageActionRow()
            .addComponents(new MessageButton().setLabel("Ticket erstellen").setEmoji("📨").setCustomId("createTicket").setStyle("SUCCESS"));

        await channel.messages.fetch();
        if (channel.messages.cache.find(m => m.author.id === this.client.user.id && m.components[0].components[0].label === "Ticket erstellen")) {
            message = await channel.messages.cache.find(m => m.author.id === this.client.user.id && m.components[0].components[0].label === "Ticket erstellen").edit({ embeds: [ticketEmbed], components: [row] });
        } else {
            message = await channel.send({ embeds: [ticketEmbed], components: [row] });
        }

        this.handleCreation(message);
    }

    listenOnOldTickets() {
        this.client.on("interactionCreate", async (interaction) => {
            if (interaction.isButton()) {
                if (this.selectionOptions.map(option => option.label + "-Tickets").includes(interaction.channel.parent.name)) {
                    const member = interaction.guild.members.cache.get(interaction.customId.split("-")[2]);
                    const customId = interaction.customId.split("-")[0];
                    if (customId === "closeConfirmedTicket") {
                        interaction.channel.permissionOverwrites.edit(member.id, { SEND_MESSAGES: false });

                        interaction.message.delete();
                        const ticketEmbed = new MessageEmbed()
                            .setColor("GOLD")
                            .setDescription(`Ticket wurde geschlossen von ${member.toString()}`);

                        const ticketEmbed1 = new MessageEmbed()
                            .setTitle("\`Ticket kontroll\`")
                            .setColor("ORANGE");

                        const ticketComponents = new MessageActionRow().addComponents(
                            new MessageButton().setLabel("Transcript").setEmoji("🗒️").setCustomId("transcriptTicket-" + interaction.customId.split("-")[1] + "-" + member.id).setStyle("PRIMARY"),
                            new MessageButton().setLabel("Öffnen").setEmoji("🔓").setCustomId("reopenTicket-" + interaction.customId.split("-")[1] + "-" + member.id).setStyle("SUCCESS"),
                            new MessageButton().setLabel("Löschen").setEmoji("⛔").setCustomId("deleteTicket-" + interaction.customId.split("-")[1] + "-" + member.id).setStyle("DANGER"),
                        );

                        interaction.channel.send({ embeds: [ticketEmbed] });
                        interaction.channel.send({ embeds: [ticketEmbed1], components: [ticketComponents] });
                    } else if (customId === "closeTicket") {
                        const ticketEmbed = new MessageEmbed().setTitle("Willst du das Ticket wirklich schließen?").setColor("ORANGE");

                        const ticketComponents = new MessageActionRow().addComponents(
                            new MessageButton().setLabel("Ja").setEmoji("✅").setCustomId("closeConfirmedTicket-" + interaction.customId.split("-")[1] + "-" + member.id).setStyle("DANGER"),
                            new MessageButton().setLabel("Nein").setEmoji("❌").setCustomId("closeCancelledTicket-" + interaction.customId.split("-")[1] + "-" + member.id).setStyle("SECONDARY"),
                        );

                        interaction.deferUpdate();
                        interaction.channel.send({ embeds: [ticketEmbed], components: [ticketComponents] });
                    } else if (customId === "closeCancelledTicket") {
                        interaction.message.delete();
                    } else if (customId === "reopenTicket") {
                        interaction.channel.permissionOverwrites.edit(member.id, { SEND_MESSAGES: true });
                        interaction.message.delete();
                    } else if (customId === "deleteTicket") {
                        if (!(this.supportRole !== undefined && interaction.member.roles.cache.has(this.supportRole) || this.chefRole === undefined && interaction.member.roles.cache.has(this.chefRole) || interaction.guild.ownerId === interaction.member.id)) return interaction.reply({ content: "Du bist dazu nicht berechtigt", ephemeral: true });
                        interaction.reply("Das Ticket wird gelöscht");
                        setTimeout(() => {
                            interaction.channel.delete();
                        }, 1800);
                    } else if (customId === "transcriptTicket") {
                        const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                            limit: -1, // Max amount of messages to fetch.
                            returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment'
                            fileName: "transcript.html", // File name for the attachment.
                            minify: false, // Minify the result? Uses html-minifier
                            saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
                            useCDN: false // Uses a CDN to serve discord styles rather than bundling it in HTML (saves ~8kb when minified)
                        });

                        interaction.channel.send({ files: [attachment] });
                    }
                }
            }
        });
    }

    /**
     * 
     * @param {Message} message 
     */
    handleCreation(message) {
        this.client.on("interactionCreate", async (interaction) => {
            if (interaction.isButton() && interaction.customId === message.components[0].components[0].customId) {

                const optionMenu = new MessageActionRow().addComponents(
                    new MessageSelectMenu().setCustomId("ticketOption-" + this.#ticketId).setPlaceholder("Wähle eine Option aus").addOptions(this.selectionOptions)
                );
                /**
                 * @type {Message}
                 */
                const inetractionMessage = await interaction.reply({ content: "Wähle eine Option aus dem **Dropdown-Menü** aus", components: [optionMenu], ephemeral: true, fetchReply: true });

                inetractionMessage.awaitMessageComponent({ componentType: "SELECT_MENU", time: 30_000 })
                    .then((collected) => {
                        this.handleSelection(interaction, collected);
                    });
                // inetractionMessage.edit({ content: "Du hast die Zeit abgelaufen, bitte wähle eine Option aus dem **Dropdown-Menü** aus" });
            }
        });
    }

    /**
     * 
     * @param {ButtonInteraction} interaction 
     * @param {MessageComponentInteraction} selection 
     */
    async handleSelection(interaction, selection) {
        interaction.editReply({ content: "Erstelle den Support channel ..." });
        if (selection.customId !== "ticketOption-" + this.#ticketId) return;
        const member = selection.member;
        const value = selection.values[0];
        const parentName = selection.message.components[0].components[0].options.find(option => option.value === value).label + "-Tickets";
        const ticketId = (parseInt(this.#ticketId) + parseInt(Math.random().toString(5).substring(2, 7))).toString().substring(0, 7);

        if (!interaction.guild.channels.cache.find((channel) => channel.type === "GUILD_CATEGORY" && channel.name === parentName)) {
            await interaction.guild.channels.create(parentName, { type: "GUILD_CATEGORY", permissionOverwrites: [{ id: interaction.guild.id, deny: ["MANAGE_MESSAGES", "VIEW_CHANNEL"] }] });
        };

        const parent = interaction.guild.channels.cache.find((channel) => channel.type === "GUILD_CATEGORY" && channel.name === parentName);

        const ticket = await interaction.guild.channels.create(selection.message.components[0].components[0].options.find(option => option.value === value).label + "-" + ticketId, {
            type: "text",
            parent: parent.id,
            permissionOverwrites: [
                {
                    id: this.client.user.id,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ADD_REACTIONS"]
                },
                {
                    id: member.id,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "ADD_REACTIONS"]
                },
                {
                    id: interaction.guild.id,
                    deny: ["VIEW_CHANNEL", "SEND_MESSAGES", "ADD_REACTIONS"]
                }
            ]
        });
        interaction.editReply({ content: `Dein Ticket wurde erstellt. Klicke hier ${ticket.toString()} um hinzuwechseln!`, components: [] });

        if (this.supportRole) {
            ticket.updateOverwrite(this.supportRole, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                ADD_REACTIONS: true
            });
        }
        if (this.chefRole) {
            ticket.updateOverwrite(this.chefRole, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                ADD_REACTIONS: true
            });
        }

        const ticketMenuEmbed = new MessageEmbed()
            .setColor("BLURPLE")
            .setDescription(`${this.selectionOptions.find(option => option.value === value).ticketText ? this.selectionOptions.find(option => option.value === value).ticketText : "Wir werden uns gleich um dich kümmern!"}`);
        console.log(ticketMenuEmbed.description);
        const ticketMenuComponents = new MessageActionRow().addComponents(
            new MessageButton().setLabel("Ticket schließen").setEmoji("🔒").setCustomId("closeTicket-" + ticketId + "-" + member.id).setStyle("SECONDARY")
        );

        ticket.send({ content: `${member.toString()} Willkommen`, embeds: [ticketMenuEmbed], components: [ticketMenuComponents] });
    }
};
