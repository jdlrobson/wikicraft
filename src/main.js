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

const init = ( initialPages, wantedList ) => {
    createApp(App, {
        wantedList,
        initialScore,
        initialPages
    }).mount('#app');
};

const pagesToTitles = ( pages ) => pages.map(({title}) => title );

function initFromInitialPages( initialPages ) {
    api.moreLike(initialPages).then((pages) => {
        init( initialPages, pagesToTitles( pages ) );
    })
}

function initFromSeeds( seed1, seed2, number = 2 ) {
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

const initFromMostRead = (y, m, d) => {
    const pad = ( num ) => num < 10 ? `0${num}` : `${num}`;
    const prefix = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia.org/all-access`;
    const url = `${prefix}/${y}/${pad( m )}/${ pad( d )}`;
    console.log(url);
    fetch(url)
        .then((r) => r.json())
        .then((data) => {
            const topPages = data.items[0].articles.map((t) => t.article.replace( /_/g, ' ')).filter((t) => !t.includes(':') && t!== 'Main Page');
            initFromSeeds(topPages[0], topPages[1], 2 )
        });
};

function chooseSeed() {
    const mode = [0, 1, 2, 3].sort(() => Math.random() < 0.5 ? -1 : 1).pop();
    const date = new Date();
    switch( mode ) {
        case 0:
            return initFromSeeds('Kaos (TV series)', 'Beetlejuice');
        case 1:
            date.setDate( date.getDate() - 1 );
            return initFromMostRead(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
            );
        case 2:
            return initFromInitialPages( [
                'Soil',
                'Fire',
                'Water',
                'Oxygen',
            ]);
        case 3:
            date.setDate( date.getDate() - 30 );
            return initFromMostRead(
                date.getFullYear(),
                date.getMonth() + 1,
                'all-days'
            )
    }
}

if ( notFoundLocal && pagesLocal ) {
    init( JSON.parse( pagesLocal ), JSON.parse( notFoundLocal ) );
} else {
    chooseSeed();
}

document.getElementById('reset').addEventListener(
    'click',
    () => {
        resetExperiment();
        location.reload();
    }
)