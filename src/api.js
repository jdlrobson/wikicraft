const moreLikeCache = {};
function moreLike(titles) {
  /**
   * classic
Ranking based on the number of incoming links, some templates, page language and recency (templates/language/recency may not be activated on this wiki).
classic_noboostlinks
Ranking based on some templates, page language and recency when activated on this wiki.
empty
Ranking based solely on query dependent features (for debug only).
wsum_inclinks
Weighted sum based on incoming links
wsum_inclinks_pv
Weighted sum based on incoming links and weekly pageviews
popular_inclinks_pv
Ranking based primarily on page views
popular_inclinks
Ranking based primarily on incoming link counts
mlr-1024rs
Weighted sum based on incoming links and weekly pageviews
growth_underlinked
Internal rescore profile used in GrowthExperiments link recommendations for prioritizing articles which do not yet have enough links.
engine_autoselect
Let the search engine decide on the best profile to use.
   */
  const mLlQuery = Array.from(titles).sort((a,b) => a < b ? -1 : 1).map((p)=>encodeURIComponent(p)).join('|');
  const profile = 'classic_noboostlinks'; //'popular_inclinks';
  if ( moreLikeCache[mLlQuery] ) {
    return Promise.resolve( moreLikeCache[mLlQuery] );
  }
  return fetch(`https://en.m.wikipedia.org/w/api.php?action=query&formatversion=2&origin=*&format=json&smaxage=86400&maxage=86400&origin=*&uselang=content&list=search&formatversion=2&srsearch=morelike%3A${mLlQuery}&srnamespace=0&srlimit=6&srqiprofile=${profile}`)  
    .then((r) => r.json())
    .then((j) => {
      const moreLikePages = j.query.search;
      try {
        moreLikeCache[mLlQuery] = moreLikePages;
        return moreLikePages;
      } catch ( e ) {
        return null;
      }
    } );
}

export default { moreLike };
