const axios = require("axios");
const fs = require("fs");
const path = require('path');

module.exports = {
  config: {
    name: "aniList",
    aliases: ["ainf"],
    version: "1.0",
    author: "TAWHID-PRO",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search Anime from AniList"
    },
    longDescription: {
      en: "Search Anime from AniList"
    },
    category: "Anime",
    guide: {
      en: "Use this command followed by the anime name to get detailed information."
    }
  },

  onStart: async function({ api, event }) { // 'message' এবং 'args' সরিয়ে ফেলা
    const animeName = event.body; // event.body থেকে animeName গ্রহণ
    if (!animeName) {
      return api.sendMessage("Please provide an anime name.", event.threadID);
    }

    const accessToken = ''; // আপনার AniList API অ্যাকসেস টোকেন এখানে দিন

    // একটি অপেক্ষার মেসেজ পাঠান
    const waitMessage = await api.sendMessage("🔍 𝗦𝗲𝗮𝗿𝗰𝗵𝗶𝗻ｇ 𝗳𝗼𝗿 𝗔𝗻𝗶𝗺𝗲,\n⏰ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗪𝗮𝗶𝘁...", event.threadID);

    try {
      const response = await axios.post('https://graphql.anilist.co', {
        query: `query {
          Media(search: "${animeName}", type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            description
            episodes
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            status
            averageScore
            genres
          }
        }`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const anime = response.data.data.Media;

      if (anime) {
        const imageUrl = `https://img.anili.st/media/${anime.id}`; // নিশ্চিত করুন যে URL সঠিক
        const imagePath = path.resolve(__dirname, 'anime.jpg');
        const writer = fs.createWriteStream(imagePath);

        // চিত্রটি ডাউনলোড করুন
        const imageResponse = await axios({
          url: imageUrl,
          method: 'GET',
          responseType: 'stream'
        });

        imageResponse.data.pipe(writer);

        writer.on('finish', async () => {
          const title = anime.title.romaji || 'Unknown';
          let description = anime.description || 'No Description';

          // বর্ণনা থেকে HTML ট্যাগ মুছে ফেলুন এবং <br> এর পরিবর্তে নতুন লাইন ব্যবহার করুন
          description = description.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, ' ');

          const startDate = `${anime.startDate.year || 'Unknown'}-${anime.startDate.month || 'Unknown'}-${anime.startDate.day || 'Unknown'}`;
          const endDate = anime.endDate ? `${anime.endDate.year || 'Unknown'}-${anime.endDate.month || 'Unknown'}-${anime.endDate.day || 'Unknown'}` : 'Still Airing';
          const status = anime.status || 'Unknown';
          const episodes = anime.episodes || 'Unknown';
          const genres = anime.genres.length > 0 ? anime.genres.join(', ') : 'Unknown';
          const score = anime.averageScore || 'Unknown';

          const message = `
🎬 𝗧𝗶𝘁𝗹𝗲: ${anime.title.romaji} || ${anime.title.english}

📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${description}

📅 𝗦𝗧𝗮𝗿𝗧 𝗗𝗮𝗧𝗲: ${startDate}
📅 𝗘𝗡𝗗 𝗗𝗮𝗧𝗲: ${endDate}
📺 𝗦𝗧𝗔𝗧𝗨𝗦: ${status}
🔮 𝗘𝗣𝗜𝗦𝗢𝗗𝗘𝗦: ${episodes}
⭐ 𝗔𝗩𝗘𝗥𝗔𝗚𝗘 𝗥𝗔𝗧𝗘: ${score}
🔰 𝗚𝗘𝗡𝗥𝗘𝗦: ${genres}
          `;

          await api.sendMessage({ body: message, attachment: fs.createReadStream(imagePath) }, event.threadID, () => {
            fs.unlinkSync(imagePath); // মেসেজ পাঠানোর পর চিত্র ফাইল মুছে ফেলুন
          });

          // চূড়ান্ত মেসেজ পাঠানোর পর অপেক্ষার মেসেজ মুছে ফেলুন
          api.deleteMessage(waitMessage.messageID);
        });

        writer.on('error', (error) => {
          console.error("Image write error: ", error);
          api.deleteMessage(waitMessage.messageID);
          return api.sendMessage("An error occurred while downloading the cover image.", event.threadID);
        });

      } else {
        api.deleteMessage(waitMessage.messageID);
        return api.sendMessage("𝗔𝗡𝗜𝗠𝗘 𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗. ❌", event.threadID);
      }
    } catch (error) {
      console.error(`Error: ${error.response ? error.response.status : error.message}`);
      api.deleteMessage(waitMessage.messageID);
      return api.sendMessage("An error occurred while fetching anime details.", event.threadID);
    }
  }
};