
// index.js
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// ---- CONFIG ----
// Prefer env vars. Fallback to literal strings if you must (not recommended).
const BOT_TOKEN = process.env.BOT_TOKEN || "REPLACE_WITH_BOT_TOKEN";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "REPLACE_WITH_TMDB_KEY";
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// TMDB helpers
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

// Map ISO language codes to readable names (add more as you like)
const LANG_NAMES = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  bn: "Bengali",
  pa: "Punjabi"
};

const escapeHtml = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Build an album caption for one movie
function captionFor(movie) {
  const title = escapeHtml(movie.title || movie.name || "");
  const date = movie.release_date || movie.first_air_date || "";
  const year = date ? date.slice(0, 4) : "—";
  const lang = LANG_NAMES[movie.original_language] || movie.original_language?.toUpperCase() || "—";
  const rating = (movie.vote_average ?? 0).toFixed(1);

  return (
    `<b>${title}</b>\n` +
    `📅 Release: ${escapeHtml(date || "—")} (${year})\n` +
    `🌐 Language: ${escapeHtml(lang)}\n` +
    `⭐ Rating: ${rating}`
  );
}

// Fetch movies from TMDB Discover endpoint
async function fetchMovies({ originalLanguage = "en", page = 1, count = 10 }) {
  const url = `${TMDB_BASE}/discover/movie`;
  const params = {
    api_key: TMDB_API_KEY,
    with_original_language: originalLanguage, // "hi" for Bollywood, "en" for Hollywood
    sort_by: "popularity.desc",
    include_adult: false,
    page
  };

  const { data } = await axios.get(url, { params });
  // Filter out entries with no poster
  return (data.results || [])
    .filter(m => m.poster_path)
    .slice(0, count);
}

// Send in albums of up to 10 (Telegram limit)
async function sendAsAlbums(chatId, movies) {
  const chunkSize = 10;
  for (let i = 0; i < movies.length; i += chunkSize) {
    const chunk = movies.slice(i, i + chunkSize);
    const mediaGroup = chunk.map(m => ({
      type: "photo",
      media: `${IMG_BASE}${m.poster_path}`,
      caption: captionFor(m),
      parse_mode: "HTML"
    }));

    // Some Telegram clients only show caption on the first item of an album.
    // That’s normal. Captions are still attached per-photo at the API level.
    await bot.sendMediaGroup(chatId, mediaGroup);
  }
}

// ---- BOT UI ----
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎬 Welcome! What do you want to explore?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎥 Movies", callback_data: "movies" }],
        [{ text: "🎵 Songs", callback_data: "songs" }],
        [{ text: "📹 Videos", callback_data: "videos" }]
      ]
    }
  });
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const action = q.data;

  try {
    if (action === "movies") {
      return bot.sendMessage(chatId, "Choose category:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎬 Bollywood", callback_data: "bollywood" }],
            [{ text: "🎬 Hollywood", callback_data: "hollywood" }]
          ]
        }
      });
    }

    if (action === "bollywood") {
      await bot.sendChatAction(chatId, "upload_photo");
      const list = await fetchMovies({ originalLanguage: "hi", count: 10 });
      if (!list.length) return bot.sendMessage(chatId, "No Bollywood results found.");
      await sendAsAlbums(chatId, list);
      return;
    }

    if (action === "hollywood") {
      await bot.sendChatAction(chatId, "upload_photo");
      const list = await fetchMovies({ originalLanguage: "en", count: 10 });
      if (!list.length) return bot.sendMessage(chatId, "No Hollywood results found.");
      await sendAsAlbums(chatId, list);
      return;
    }

    if (action === "songs") {
      return bot.sendMessage(chatId, "🎵 Songs feature coming soon…");
    }

    if (action === "videos") {
      return bot.sendMessage(chatId, "📹 Videos feature coming soon…");
    }
  } catch (err) {
    console.error("Telegram/TMDB error:", err?.response?.data || err.message || err);
    bot.sendMessage(chatId, "⚠️ Could not load posters. Check TMDB key and network.");
  }
});























// const TelegramBot = require("node-telegram-bot-api");
// const TOKEN = "8345048516:AAFPNYXvSUopIjlSQaEWNq012MKNla7G1Bs";

// const bot = new TelegramBot(TOKEN, { polling: true });

// // Dummy Movies
// const movies = {
//   bollywood: [
//     { id: 1, title: "Pathaan", year: "2023", language: "Hindi", rating: 7.8, poster: "https://image.tmdb.org/t/p/w500/oudDtyO5n8K2sFmqpaYYuQUOo32.jpg" },
//     { id: 2, title: "RRR", year: "2022", language: "Telugu/Hindi", rating: 8.0, poster: "https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg" },
//     { id: 3, title: "Brahmastra", year: "2022", language: "Hindi", rating: 6.7, poster: "https://image.tmdb.org/t/p/w500/k5qxnbjY0FQ1Aq5vN0bWnZvsk5o.jpg" },
//     { id: 4, title: "KGF 2", year: "2022", language: "Kannada/Hindi", rating: 8.4, poster: "https://image.tmdb.org/t/p/w500/tqUD26YGjKmFqOJAgbNBah1gX0N.jpg" },
//     { id: 5, title: "Gadar 2", year: "2023", language: "Hindi", rating: 6.5, poster: "https://image.tmdb.org/t/p/w500/2QW9sYlSy4s5tVbT9KuX3sI5OG1.jpg" }
//   ],
//   hollywood: [
//     { id: 6, title: "Oppenheimer", year: "2023", language: "English", rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/8Gx0WyoVJf0Y8JcJ7d0eD6JH8kM.jpg" },
//     { id: 7, title: "Avatar: The Way of Water", year: "2022", language: "English", rating: 7.7, poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
//     { id: 8, title: "The Batman", year: "2022", language: "English", rating: 7.8, poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg" },
//     { id: 9, title: "Avengers: Endgame", year: "2019", language: "English", rating: 8.4, poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
//     { id: 10, title: "Interstellar", year: "2014", language: "English", rating: 8.6, poster: "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg" }
//   ]
// };

// // Start Command
// bot.onText(/\/start/, (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, "🎬 Welcome! What do you want to explore?", {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: "🎥 Movies", callback_data: "movies" }],
//         [{ text: "🎵 Songs", callback_data: "songs" }],
//         [{ text: "📹 Videos", callback_data: "videos" }],
//       ],
//     },
//   });
// });

// // Handle Category Selection
// bot.on("callback_query", (callbackQuery) => {
//   const chatId = callbackQuery.message.chat.id;
//   const action = callbackQuery.data;

//   if (action === "movies") {
//     bot.sendMessage(chatId, "Choose category:", {
//       reply_markup: {
//         inline_keyboard: [
//           [{ text: "🎬 Bollywood", callback_data: "bollywood" }],
//           [{ text: "🎬 Hollywood", callback_data: "hollywood" }],
//         ],
//       },
//     });
//   }

//   if (action === "bollywood" || action === "hollywood") {
//     const selectedMovies = movies[action];

//     // Create album of multiple posters
//     const mediaGroup = selectedMovies.map((movie) => ({
//       type: "photo",
//       media: movie.poster,
//       caption: `🎬 *${movie.title}*  
// 📅 Year: ${movie.year}  
// 🌐 Language: ${movie.language}  
// ⭐ Rating: ${movie.rating}`,
//       parse_mode: "Markdown"
//     }));

//     bot.sendMediaGroup(chatId, mediaGroup).catch(err => {
//       console.error("❌ Error sending posters:", err.message);
//       bot.sendMessage(chatId, "⚠️ Could not load posters.");
//     });
//   }

//   if (action === "songs") {
//     bot.sendMessage(chatId, "🎵 Songs feature coming soon...");
//   }

//   if (action === "videos") {
//     bot.sendMessage(chatId, "📹 Videos feature coming soon...");
//   }
// });
