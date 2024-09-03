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

const init = ( initialPages, wantedList, algorithm = '0' ) => {
    createApp(App, {
        wantedList,
        initialScore,
        initialPages,
        algorithm
    }).mount('#app');
};

const pagesToTitles = ( pages ) => pages.map(({title}) => title );

function initFromInitialPages( initialPages, algorithm ) {
    api.moreLike(initialPages).then((pages) => {
        init( initialPages, pagesToTitles( pages ), algorithm );
    })
}

function initFromSeeds( seed1, seed2, number = 2, algorithm = '0' ) {
    api.moreLike( [ seed1 ] ).then((pagesFromFirstSeed) => {
        const p1 = pagesToTitles( pagesFromFirstSeed );
        api.moreLike( [ seed2 ] ).then((pagesFromSecondSeed) => {
            const p2 = pagesToTitles( pagesFromSecondSeed );
            const initialPages = [ seed1, seed2 ].concat(
                p1.slice( 0, Math.round( number / 2 ) )
            ).concat(
                p2.slice( 0, Math.round( number / 2 ) )
            );
            initFromInitialPages( initialPages );
        } );
    });
}

const initFromMostRead = (y, m, d, algorithm) => {
    const pad = ( num ) => num < 10 ? `0${num}` : `${num}`;
    const prefix = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access`;
    const url = `${prefix}/${y}/${pad( m )}/${ pad( d )}`;
    console.log(url);
    fetch(url)
        .then((r) => r.json())
        .then((data) => {
            const topPages = data.items[0].articles.map((t) => t.article.replace( /_/g, ' ')).filter((t) => !t.includes(':') && t!== 'Main Page');
            initFromSeeds(topPages[0], topPages[1], 2, algorithm )
        });
};

function initMode( mode = 0, algorithm = 0 ) {
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

const algorithm = localStorage.getItem('algorithm') || '0';
const gamepack = localStorage.getItem('gamepack') || '0';
const urlTitles = urlParams.getAll('t');

if ( urlTitles ) {
    initFromInitialPages( urlTitles, algorithm);
} else if ( notFoundLocal && pagesLocal ) {
    init( JSON.parse( pagesLocal ), JSON.parse( notFoundLocal ) );
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