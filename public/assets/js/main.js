"use strict";

const ctxMenu = document.querySelector("#context-menu");

const defineAction = ctxMenu.querySelector('[data-action="define"]');
const searchAction = ctxMenu.querySelector('[data-action="search"]');
const ttsAction = ctxMenu.querySelector('[data-action="tts"]');

const dictLookup = document.querySelector("#dictionary-lookup");

const ttsVoiceList = document.querySelector('#voice')
const ttsRateRange = document.querySelector('#rate')
const ttsPitchRange = document.querySelector('#pitch')
const ttsVolumeRange = document.querySelector('#volume')

let ctxMenuVisible = false;
let dictLookupVisible = false;

const toggleElm = (elm, cmd) => {
  elm.style.display = cmd === "show" ? "block" : "none";
};

const setPosElm = (elm, { top, left }) => {
  elm.style.top = `${top}px`;
  elm.style.left = `${left}px`;

  toggleElm(elm, "show");
};

function getPages() {
  return new Promise((resolve) => {
    let id = setInterval(() => {
      const pages = document.querySelectorAll(".page");

      if (pages.length > 0) {
        resolve(pages);
        clearInterval(id);
      }
    }, 10);
  });
}

function getSelectedText() {
  if (window.getSelection) return window.getSelection().toString();
  if (document.getSelection) return document.getSelection().toString();
  if (document.selection) return document.selection.createRange().text;
}

getPages().then((pages) => {
  pages.forEach((page) => {
    page.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      const selectedText = getSelectedText()
        .replace(/\r?\n|\r/gm, "")
        .trim();

      if (selectedText !== "") {
        defineAction.dataset.payload = selectedText;
        defineAction.innerHTML = `Lookup Dictionary for &#8220;<span class="text-truncate">${selectedText}</span>&#8221;`;
        if (selectedText.split(" ").length === 1) defineAction.removeAttribute("disabled");

        searchAction.dataset.payload = selectedText;
        searchAction.innerHTML = `Search Google for &#8220;<span class="text-truncate">${selectedText}</span>&#8221;`;

        ttsAction.dataset.payload = selectedText;
        ttsAction.innerHTML = `Text to Speech for &#8220;<span class="text-truncate">${selectedText}</span>&#8221;`;

        setPosElm(ctxMenu, { top: e.clientY, left: e.clientX });
        ctxMenuVisible = true;
      } else {
        toggleElm(ctxMenu, "hide");
        ctxMenuVisible = false;

        defineAction.setAttribute("disabled", "");
      }
    });
  });
});

defineAction.addEventListener("click", (e) => {
  const { payload } = defineAction.dataset;

  if (payload.split(" ").length === 1) {
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(payload)}`)
      .then((resp) => {
        if(resp.status === 200) return resp.json();
        throw new Error("Something went wrong!")
      })
      .then((data) => {
        try {
          dictLookup.querySelector(".card-title").textContent = payload;
          dictLookup.querySelector(".card-text").textContent = data[0].meanings[0].definitions[0].definition;

          setPosElm(dictLookup, { top: e.clientY, left: e.clientX });
          dictLookupVisible = true;
        } catch (error) {
          console.log(error);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

searchAction.addEventListener("click", (e) => {
  window.open(`https://www.google.com/search?q=${encodeURIComponent(searchAction.dataset.payload)}`, "_blank");
});

function getSynth() {
  if (typeof window.speechSynthesis === "undefined") return;

  const synth = window.speechSynthesis;

  return new Promise((resolve) => {
    const id = setInterval(() => {
      if (synth.getVoices().length !== 0) {
        resolve(synth);
        clearInterval(id);
      }
    }, 10);
  });
}

function populateVoiceList(synth) {
  const voiceList = synth.getVoices().sort((a, b) => {
    const aName = a.name.toUpperCase();
    const bName = b.name.toUpperCase();

    if (aName < bName) return -1;
    else if (aName === bName) return 0;
    else return +1;
  });

  for (let i = 0; i < voiceList.length; i++) {
    const voice = voiceList[i];

    const option = document.createElement("option");

    option.textContent = `${voice.name} (${voice.lang})`;

    if (voice.default) {
      option.textContent += " — DEFAULT";
      option.setAttribute("selected", "");
    }

    option.setAttribute("data-name", voice.name);
    option.setAttribute("data-lang", voice.lang);

    ttsVoiceList.appendChild(option);
  }

  return voiceList;
}

function speak(text, synth, voiceList) {
  if (synth.speaking) {
    console.error("speechSynthesis.speaking");
    return;
  }

  if (text.trim() !== "") {
    const utterThis = new SpeechSynthesisUtterance(text);

    const selectedOption = ttsVoiceList.selectedOptions[0].getAttribute("data-name");

    for (let i = 0; i < voiceList.length; i++) {
      const voice = voiceList[i];

      if (voice.name === selectedOption) {
        utterThis.voice = voice;
        utterThis.lang = ttsVoiceList.selectedOptions[0].getAttribute("data-lang");
        break;
      }
    }

    utterThis.rate = ttsRateRange.value;
    utterThis.pitch = ttsPitchRange.value;
    utterThis.volume = ttsVolumeRange.value;

    /* utterThis.onerror = (e) => {
      console.error("SpeechSynthesisUtterance.onerror");
    };

    utterThis.addEventListener("boundary", (e) => {
      console.log(`${e.name} boundary reached after ${e.elapsedTime} seconds.`);
    });

    utterThis.addEventListener('end', (e) => {
      console.log(`Utterance has finished being spoken after ${e.elapsedTime} seconds.`);
    });

    utterThis.addEventListener('mark', (e) => {
      console.log(`A mark was reached: ${e.name}`);
    });

    utterThis.addEventListener('pause', (e) => {
      console.log(`Speech paused after ${e.elapsedTime} seconds.`);
    });

    utterThis.addEventListener('resume', (e) => {
      console.log(`Speech resumed after ${e.elapsedTime} seconds.`);
    });

    utterThis.addEventListener('start', (e) => {
      console.log(`We have started uttering this speech: ${e.utterance.text}`);
    }); */

    synth.speak(utterThis);
  }
}

getSynth().then((synth) => {
  let voiceList = populateVoiceList(synth);

  if (typeof synth !== "undefined" && synth.onvoiceschanged !== undefined) {
    synth.addEventListener("voiceschanged", (e) => {
      voiceList = populateVoiceList(synth);
    });
  }

  ttsRateRange.addEventListener("change", (e) => {
    document.querySelector('#rate-value').textContent = ttsRateRange.value;
  });

  ttsPitchRange.addEventListener("change", (e) => {
    document.querySelector('#pitch-value').textContent = ttsPitchRange.value;
  });

  ttsVolumeRange.addEventListener("change", (e) => {
    document.querySelector('#volume-value').textContent = ttsVolumeRange.value;
  });

  // document
  //   .querySelector('#tts-settings-modal [data-action="submit"]')
  //   .addEventListener("click", (e) => {
  //     e.preventDefault();
  //   });

  ttsVoiceList.addEventListener("change", (e) => {
    speak("The quick brown fox jumps over the lazy dog", synth, voiceList);
  });

  ttsAction.addEventListener("click", (e) => {
    speak(ttsAction.dataset.payload, synth, voiceList);
  });
});

window.addEventListener("click", (e) => {
  toggleElm(ctxMenu, "hide");
  toggleElm(dictLookup, "hide");

  defineAction.setAttribute("disabled", "");
});
