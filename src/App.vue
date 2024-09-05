<template>
  <div>
    <header>
      <h1>WikiKnowledge Maker</h1>
      <p class="scoreline">Score:&nbsp;<span>{{  ( score * pages.length ) +  pages.length }}</span>
        <cdx-button
          v-if="shareable"
          weight="quiet"
          aria-label="Share"
          @click="share"
        >
          <cdx-icon :icon="shareIcon" />
        </cdx-button>
      </p>
      <div class="checklist">
        <p>Articles to find</p>
        <div class="scrollable">
          <cdx-info-chip v-for="mission in notFound">{{ mission }}</cdx-info-chip>
        </div>
      </div>
    </header>
    <div v-if="celebrate" class="celebration">
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
      <Firework></Firework>
    </div>
    <div class="craftingBoard">
      <div v-if="board.length" class="preview">
        <div class="toolbar">
          <cdx-button :disabled="fetchInProgress || board.length < 2"
            @click="combine" action="progressive">Combine these articles</cdx-button>
          <cdx-button :disabled="!board.length || fetchInProgress"
            class="clear" @click="clear">Clear recipe</cdx-button>
        </div>
        <cdx-message v-if="cannotMix">Cannot mix these pages. Try another pair.</cdx-message>
        <div v-for="page in board" class="scrollable">
          <div v-if="previews[page]">
            <cdx-card :thumbnail="previews[page].thumbnail"
              :class="cardClass"
              :url="previews[page].url"
        			:force-thumbnail="true">
              <template #title>
                {{ previews[page].title }}
              </template>
              <template #description>
                <div v-html="previews[page].extract_html"></div>
              </template>

            </cdx-card>
          </div>
        </div>
      </div>
      <div v-else class="help-panel">
        <div v-if="score === 0">
          <p>Select <strong>two</strong> article titles from the <strong>panel below</strong> to try to make an article that matches an article in the <strong>above list of articles to find</strong>.</p>
          <p>If you successfully find one of the articles above you'll score a point!</p>
        </div>
        <div v-else>
          <p>Your recipe is empty. Select two articles from below.</p>
        </div>
      </div>
    </div>
    <div class="inventory">
      <cdx-text-input v-model="activeFilter" placeholder="Filter"></cdx-text-input>
      <div class="scrollable">
        <cdx-button
          v-for="page in shownPages" @click="addToBoard(page)">{{page}}</cdx-button>
      </div>
    </div>
  </div>
</template>

<script>
import { cdxIconShare } from '@wikimedia/codex-icons';
import api from './api.js';
import { CdxButton, CdxIcon, CdxCard,
  CdxMessage, CdxInfoChip, CdxTextInput } from '@wikimedia/codex';
import soundLogo from './components/assets/soundlogo.wav';
import Firework from './components/Firework.vue';
import { defineComponent, ref, onMounted } from 'vue';
const SHARE_URL = `https://en.wikipedia.org`;
const score = ref(0);
let pages = ref([]);
const previews = ref({});
const algorithm = ref('0');
const board = ref([]);
const cannotMix = ref(false);
const fetchInProgress = ref(false);
const celebrate = ref(false);
let notFound = ref([]);

const addToNotFound = ( title ) => {
  console.log('addToNotFound', title);
  if ( notFound.value.length < 7 && !notFound.value.includes(title) && !pages.value.includes(title)) {
    notFound.value.push(title);
  }
  localStorage.setItem('notFound', JSON.stringify(notFound.value));
};

const assignNewMission = () => {
    // remove pages we already found.
    notFound.value = notFound.value.filter((title) => !pages.value.includes(title));
};

const mwApiToCodexData = ( data ) => {
  const thumb = data.thumbnail;
  return Object.assign( {}, data, {
    url: data.content_urls.desktop.page,
    thumbnail: thumb ? {
      width: thumb.width,
      height: thumb.height,
      url: thumb.source
    } : undefined
  } );
};
const loadSummary = ( title ) => {
  previews.value[title] = { title, extract_html: '...' };
  return fetch(`https://en.m.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    .then((r) => r.json())
    .then((r) => {
      const data = mwApiToCodexData( r );
      previews.value[title] = data;
    });
}

function moreLike(titles, algorithm) {
  fetchInProgress.value = true;
  return api.moreLike( titles, algorithm ).then(( moreLikePages ) => {
    fetchInProgress.value = false;
    return moreLikePages;
  });
}

const saveNewTitle = ( newTitle ) => {
  // Is this a new title?
  if ( !pages.value.includes(newTitle)) {
    pages.value.push(newTitle);
    loadSummary(newTitle);
  }
  // Did we find the mission title?
  if ( notFound.value.includes( newTitle ) ) {
    startCelebration();
    assignNewMission();
  }
  // store locally
  localStorage.setItem('pages', JSON.stringify(pages.value));
};

const clearCelebration = () => {
  setTimeout(() => {
    celebrate.value = false;
  }, 2000);
}
const startCelebration = () => {
  score.value += 1;
  localStorage.setItem('completed', String(score.value));
  celebrate.value = true;
  const audio = new Audio(soundLogo);
  audio.play();
  localStorage.setItem( 'date', new Date() );
  clearCelebration();
}

const pushToBoard = ( title, clear = false ) => {
  cannotMix.value = false;
  if ( clear ) {
    board.value = [];
  }
  if ( board.value.length === 2 ) {
    board.value[1] = title;
  } else {
    board.value.push(title);
  }
  // load preview if we havent got it.
  if ( !previews.value[title] ) {
    loadSummary(title);
  }
}

export default defineComponent({
  components: {
    CdxMessage,
    CdxIcon,
    CdxInfoChip,
    CdxButton,
    CdxTextInput,
    CdxCard,
    Firework
  },
  computed: {
    cardClass() {
      return {
        cardThrob: fetchInProgress.value
      };
    },
    shownPages() {
      return this.pages.filter((page) => !this.activeFilter
        || page.toLowerCase().includes(this.activeFilter.toLowerCase()));
    }
  },
  props: {
		shareable: {
			type: Boolean,
			default: navigator.clipboard !== undefined || navigator.share !== undefined
		},
    shareIcon: {
      type: String,
      default: cdxIconShare
    },
    wantedList: {
      type: Array,
      required: true
    },
    initialPages: {
      type: Array,
      required: true
    },
    algorithm: {
      type: String,
      default: '0'
    },
    initialScore: {
      type: Number,
      default: 0
    }
  },
  methods: {
    share() {
      const SHARE_TEXT = `I found ${this.score} articles in WikiCraft today!`;
      // pass.
      try {
        navigator.clipboard.writeText( SHARE_TEXT );
      } catch (error) {
        console.log('clipboard text error', error);
      }
      if ( navigator.share ) {
          const shareData = {
            title: `Wikicraft xx/xx/xxxx`,
            text: SHARE_TEXT,
            url: SHARE_URL
          };
          return navigator.share(shareData);
      } else {
        alert('Text has been shared to your clipboard.');
      }
    },
    clear() {
      board.value = [];
    },
    combine() {
      cannotMix.value = false;
      moreLike(board.value, this.algorithm).then((moreLikePages) => {
          if ( !moreLikePages.length ) {
            cannotMix.value = true;
            return;
          }
          const newTitle = moreLikePages[0].title;
          if ( newTitle ) {
            pushToBoard( newTitle, true );
            saveNewTitle( newTitle );
          }

          // check the new title with something random
          moreLike([
            newTitle,
            Array.from( this.pages ) .sort(() => Math.random() < 0.5 ? -1 : 1)[0]
          ], this.algorithm).then((moreLikePages) => {
            if ( moreLikePages.length ) {
              addToNotFound( moreLikePages[0].title );
            }
          })
      });
    },
    addToBoard(title) {
      pushToBoard(title);
    }
  },
  setup( props ) {
    const activeFilter = ref('');
    pages.value = props.initialPages;
    notFound.value = props.wantedList;
    assignNewMission();
    score.value = props.initialScore;
    onMounted(async () => {
    });

    algorithm.value = props.algorithm;
    return {
      algorithm,
      cannotMix,
      score,
      fetchInProgress,
      celebrate,
      activeFilter,
      notFound,
      previews,
      board,
      pages
    };
  },
});
</script>
<style>
body {
  font-family: -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Inter", "Helvetica", "Arial", sans-serif
}
header {
  height: 20vh;
  margin: 0;
  text-align: center;
  background: var(--background-color-progressive, #36c);
  color: white;
  padding: 20px 0;
  display: flex;
  flex-flow: column;
}
header p {
  margin: 0;
}
header h1 {
  margin: 0;
  font-family: sans-serif;
}
.scrollable {
  overflow: scroll;
}
header .scrollable {
  height: 10vh;
}
.craftingBoard {
  height: 50vh;
  display: flex;
  padding: 10px;
}
.craftingBoard .cdx-card {
  max-height: 25vh;
}
.craftingBoard .cdx-card__text__description p {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.inventory {
  border-top: solid 1px black;
  padding: 8px;
  height: 30vh;
}
.inventory .scrollable {
  height: 15vh;
}
.celebration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.cardThrob {
  animation: pulse-animation 0.5s infinite;
}
.cdx-info-chip {
  background: white;
}
@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0px rgba(0, 0, 0, 0.2);
  }
  100% {
    box-shadow: 0 0 0 20px rgba(0, 0, 0, 0);
  }
}
.checklist {
  text-align: left;
  padding: 0 8px;
}
.help-panel {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.toolbar {
  margin-bottom: 10px;
}
.scoreline {
  display: flex;
  align-items: center;
  justify-content: center;
}
.scoreline .cdx-icon {
  color: white;
}
</style>