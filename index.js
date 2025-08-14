const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const { token, clientId, guildId } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// تحميل المنتجات من JSON (مع التحقق من وجود الملف)
let products = [];
try {
    if (fs.existsSync('./products.json')) {
        const data = fs.readFileSync('./products.json', 'utf8');
        products = data ? JSON.parse(data) : [];
    }
} catch (error) {
    console.error('خطأ في قراءة products.json:', error);
    products = [];
}

// تعريف سلاش كوماند لإضافة منتج
const addProductCommand = new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('إضافة منتج جديد')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('اسم المنتج')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('وصف المنتج (يمكن وضع أسطر متعددة باستخدام ・)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('image')
            .setDescription('رابط الصورة')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('download')
            .setDescription('رابط التحميل')
            .setRequired(true));

// تسجيل السلاش كوماند
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('Refreshing commands...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [addProductCommand.toJSON()] }
        );
        console.log('Commands loaded!');
    } catch (error) {
        console.error(error);
    }
})();

// تشغيل البوت
client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

// التعامل مع السلاش كوماند
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'addproduct') {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const image = interaction.options.getString('image');
        const download = interaction.options.getString('download');

        // تحويل الفواصل "・" إلى أسطر جديدة
        const formattedDescription = description.replace(/・/g, '\n');

        // إنشاء الإيمبد
        const embed = new EmbedBuilder()
            .setTitle(name)
            .setDescription(formattedDescription)
            .setImage(image)
            .setColor('Blue');

        // إنشاء زر التحميل
        const buttonId = `download_${Date.now()}`;
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId)
                .setLabel('تحميل')
                .setStyle(ButtonStyle.Primary)
        );

        // حفظ رابط التحميل مؤقتاً
        client.downloadLinks = client.downloadLinks || {};
        client.downloadLinks[buttonId] = download;

        // حفظ المنتج في JSON
        products.push({ name, description, image, download });
        fs.writeFileSync('./products.json', JSON.stringify(products, null, 2));

        await interaction.reply({ embeds: [embed], components: [button] });
    }
});

// التعامل مع الضغط على زر التحميل
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const link = client.downloadLinks ? client.downloadLinks[interaction.customId] : null;
    if (!link) return interaction.reply({ content: 'الرابط غير موجود!', ephemeral: true });

    try {
        await interaction.user.send(`رابط التحميل: ${link}`);
        await interaction.reply({ content: 'تم إرسال رابط التحميل في الخاص!', ephemeral: true });
    } catch (err) {
        await interaction.reply({ content: 'لا يمكن إرسال الرابط في الخاص!', ephemeral: true });
    }
});

client.login(token);
