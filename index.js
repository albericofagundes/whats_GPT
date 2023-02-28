import { create } from "venom-bot";
import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import axios from "axios";

dotenv.config();

create({
  session: "Chat-GPT",
  multidevice: true,
})
  .then((client) => start(client))
  .catch((erro) => {
    console.log(erro);
  });

const configuration = new Configuration({
  organization: process.env.ORGANIZATION_ID,
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const getDavinciResponse = async (clientText) => {
  const options = {
    model: "text-davinci-003", // Modelo GPT a ser usado
    prompt: clientText, // Texto enviado pelo usuário
    temperature: 1, // Nível de variação das respostas geradas, 1 é o máximo
    max_tokens: 4000, // Quantidade de tokens (palavras) a serem retornadas pelo bot, 4000 é o máximo
  };

  try {
    const response = await openai.createCompletion(options);
    console.log("response", response);
    let botResponse = "";
    response.data.choices.forEach(({ text }) => {
      botResponse += text;
    });
    return `Chat GPT 🤖\n\n ${botResponse.trim()}`;
  } catch (e) {
    let response = `❌ OpenAI Response Error: ${e.response.data.error.message}`;
    console.log("error", e);
    return response;
  }
};

const getDalleResponse = async (clientText) => {
  const options = {
    prompt: clientText, // Descrição da imagem
    n: 1, // Número de imagens a serem geradas
    size: "1024x1024", // Tamanho da imagem
  };

  try {
    const response = await openai.createImage(options);
    return response.data.data[0].url;
  } catch (e) {
    return `❌ OpenAI Response Error: ${e.response.data.error.message}`;
  }
};

const commands = (client, message) => {
  const iaCommands = {
    davinci3: "/bot",
    dalle: "/img",
    poke: "/poke",
    pokeList: "/pokeList",
  };

  let firstWord = message.text.substring(0, message.text.indexOf(" "));
  const question = message.text.substring(message.text.indexOf(" "));

  switch (firstWord) {
    case iaCommands.davinci3:
      getDavinciResponse(question).then((response) => {
        /*
         * Faremos uma validação no message.from
         * para caso a gente envie um comando
         * a response não seja enviada para
         * nosso próprio número e sim para
         * a pessoa ou grupo para o qual eu enviei
         */
        client.sendText(
          message.from === process.env.BOT_NUMBER ? message.to : message.from,
          response
        );
      });
      break;

    case iaCommands.poke:
      getAndSendPokemonData(client, message, question);

      // console.log(message.text);
      // console.log(
      //   "iaCommands.poke",
      //   message.text.substring(message.text.indexOf(" "))
      // );

      // try {
      //   const response = axios.get("https://pokeapi.co/api/v2/pokemon/pikachu");

      //   const data = response.data;

      //   console.log(" response", response);
      // } catch (error) {
      //   console.log("error", error);
      // }

      // const response = axios.get("https://pokeapi.co/api/v2/pokemon/pikachu");

      // const pokeData = message.text.substring(message.text.indexOf(" "));
      // const response = axios.get(
      //   `https://pokeapi.co/api/v2/pokemon/${message.text.substring(
      //     message.text.indexOf(" ")
      //   )}`
      //   // "https://pokeapi.co/api/v2/pokemon/pikachu"
      // );

      // Baixar a imagem do front_default

      // const imageResponse = fetch(data.sprites.front_default);
      // const imageData = imageResponse.buffer();
      // const base64ImageData = imageData.toString("base64");
      // console.log("imageResponse", imageResponse);
      // console.log("imageData", imageData);

      // const messageText = `Nome: ${data.name}\nTipo: ${data.types[0].type.name}`;

      // client.sendText(message.from, messageText);

      // const sticker = client.sendImageAsSticker(
      //   message.from,
      //   `data:image/png;base64,${base64ImageData}`,
      //   { author: "PokeAPI" },
      //   { pack: "Pokemons", keepScale: true }
      // );

      break;

    case iaCommands.dalle:
      const imgDescription = message.text.substring(message.text.indexOf(" "));
      getDalleResponse(imgDescription, message).then((imgUrl) => {
        client.sendImage(
          message.from === process.env.PHONE_NUMBER ? message.to : message.from,
          imgUrl,
          imgDescription,
          "Imagem gerada pela IA DALL-E 🤖"
        );
      });
      break;

    case iaCommands.pokeList:
      getAndSendPokemonList(client, message);

      break;
  }
};

async function getAndSendPokemonData(client, message, question) {
  try {
    // const pokeData = message.text.substring(message.text.indexOf(" "));
    console.log("question", question);
    console.log("message", message);
    // const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${message.text.substring(message.text.indexOf(" "))}`);
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${question.trim()}`
    );
    const data = response.data;
    console.log("response.data", response.data);

    const imageResponse = await axios.get(data.sprites.front_default, {
      responseType: "arraybuffer",
    });
    const base64ImageData = Buffer.from(imageResponse.data, "binary").toString(
      "base64"
    );

    const messageText = `Nome: ${data.name}\nTipo: ${data.types[0].type.name}`;

    const sticker = await client.sendImageAsSticker(
      message.from,
      `data:image/png;base64,${base64ImageData}`,
      { author: "PokeAPI" },
      { pack: "Pokemons", keepScale: true }
    );

    await client.sendText(message.from, messageText);
  } catch (error) {
    console.log("error", error);
    await client.sendText(
      message.from,
      `Ocorreu um erro ao obter as informações do Pokemon: ${error.message}`
    );
  }
}

async function getAndSendPokemonList(client, message) {
  try {
    // Faz a requisição na PokeAPI para obter a lista de Pokemons
    const response = await axios.get("https://pokeapi.co/api/v2/pokemon");
    const pokemonList = response.data.results;
    const pokemonNames = pokemonList.map((pokemon) => pokemon.name).join("\n");
    const messageBody = `Lista de Pokemons:\n${pokemonNames}`;

    // Envia a lista de Pokemons como mensagem no mesmo grupo
    await client.reply(message.from, messageBody, message.id.toString());
  } catch (error) {
    console.log(error);
  }
}

// e substituir a chamada da função na parte de "commands" por:

// case iaCommands.poke:
//   getAndSendPokemonData(client, message);
//   break;

async function start(client) {
  client.onAnyMessage((message) => commands(client, message));
}
// async function start(client) {
//   client.onAnyMessage((message) => commands(client, message));
// }
