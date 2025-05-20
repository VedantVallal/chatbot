const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");


const API_KEY = "AIzaSyA4paI15Xix06s_kCaTIO8z6O3ti_zy9C8";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40); 
};

const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });
  try {

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
   
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  setTimeout(() => {

    const botMsgHTML = `<img class="avatar" src="data:image/jpeg;base64,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" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600); 
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());