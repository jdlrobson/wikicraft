import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import api from './api.js';

const resetExperiment = () => {
    // clear cache.
    localStorage.removeItem('completed');
    localStorage.removeItem('pages');
    localStorage.removeItem('notFound');
};

const pagesLocal = localStorage.getItem('pages');
const completedLocal = localStorage.getItem('completed');
const initialScore = completedLocal ? parseInt(completedLocal) : 0;
const notFoundLocal = localStorage.getItem('notFound');
const urlParams = new URLSearchParams(location.search);

const init = ( initialPages, wantedList, algorithm ) => {
    createApp(App, {
        wantedList,
        initialScore,
        initialPages,
        algorithm
    }).mount('#app');
};

const pagesToTitles = ( pages ) => pages.map(({title}) => title );

function initFromInitialPages( initialPages, algorithm ) {
    // generate each of the unique pairs
    const pairs = [];
    for ( let i = 0; i < initialPages.length; i++ ) {
        for ( let j = i; j < initialPages.length; j++ ) {
            pairs.push( [ initialPages[ i ], initialPages[ j ] ] )
        }
    }
    Promise.all(
        pairs.map(( pair ) => api.moreLike(pair, algorithm))
    ).then((a) => {
        init(
            initialPages,
            Array.from(
                new Set( pagesToTitles( [].concat.apply([], a) ) )
            ),
            algorithm
        )
    })
}


const initFromMostRead = (y, m, d, algorithm) => {
    const pad = ( num ) => num < 10 ? `0${num}` : `${num}`;
    const prefix = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access`;
    const url = `${prefix}/${y}/${pad( m )}/${ pad( d )}`;
    fetch(url)
        .then((r) => r.json())
        .then((data) => {
            const topPages = data.items[0].articles.map((t) => t.article.replace( /_/g, ' ')).filter((t) => !t.includes(':') && t!== 'Main Page');
            initFromInitialPages( topPages.slice(0, 4), algorithm );
        });
};

function initMode( mode = 0, algorithm ) {
    const date = new Date();
    switch( mode ) {
        case '1':
            return initFromInitialPages( [
                'Soil',
                'Fire',
                'Water',
                'Oxygen',
            ], algorithm);
        case '2':
            date.setDate( date.getDate() - 1 );
            return initFromMostRead(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                algorithm
            );
        case '3':
            date.setDate( date.getDate() - 30 );
            return initFromMostRead(
                date.getFullYear(),
                date.getMonth() + 1,
                'all-days',
                algorithm
            )
        case '0':
        default:
            return initFromInitialPages( [
                'Zeus',
                'Movie',
                'Water',
                'Science',
            ], algorithm);
    }
}

const algorithm = localStorage.getItem('algorithm') || '3';
const gamepack = localStorage.getItem('gamepack') || '1';
const urlTitles = urlParams.getAll('t');

if ( urlTitles.length ) {
    initFromInitialPages( urlTitles, algorithm );
} else if ( notFoundLocal && pagesLocal ) {
    init( JSON.parse( pagesLocal ), JSON.parse( notFoundLocal ), algorithm );
} else {
    initMode( gamepack, algorithm );
}

const form = document.getElementById('reset');
form.style.display = '';
const modeDropdown = form.querySelector('[name="mode"]');
modeDropdown.value = gamepack;
const algorithmDropdown = form.querySelector('[name="algorithm"]');
algorithmDropdown.value = algorithm;
form.addEventListener(
    'submit',
    () => {
        resetExperiment();
        localStorage.setItem('gamepack', modeDropdown.value );
        localStorage.setItem('algorithm', algorithmDropdown.value );
        location.reload();
    }
)