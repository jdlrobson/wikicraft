const moreLikeCache = {};

async function cacheFetch(url) {
  if ( moreLikeCache[url]) {
    return Promise.resolve( moreLikeCache[url] );
  } else {
    const response = await fetch(url);
    const data = await response.json();
    moreLikeCache[url] = data;
    return data;
  }
}

async function getLinks(pageTitle) {
  // Encode the page title and build the API URL
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    pageTitle
  )}&prop=text&format=json&origin=*`;

  try {
    // Fetch the parsed HTML content of the page
    const data = await cacheFetch(apiUrl);

    // Parse the returned HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.parse.text["*"], "text/html");

    // Select all anchor (<a>) elements on the page
    const links = doc.querySelectorAll("a:not(.mw-disambig):not(.external):not(.external ~ a):not(.mw-redirect):not(.infobox a):not(cite a):not(.refbegin):not(.references a):not(.navbox a)");

    return Array.from(links).map((link) => link.title).filter((t) => t &&
      !t.includes(':') && !['Wayback Machine'].includes(t));
  } catch (error) {
    console.error("Error fetching or parsing page:", error);
  }
}

function intersection(arr1, arr2) {
  // Convert one array to a Set for efficient lookup
  const set2 = new Set(arr2);
  
  // Filter the first array to keep only elements present in the set
  return Array.from( new Set( arr1 ) ).filter(item => set2.has(item));
}

function countLinkOccurances(links) {
  const countLinks = {};
  links.forEach((l) => {
    countLinks[l] = countLinks[l] || 0;
    countLinks[l]++;
  });
  return countLinks;
}
function mostLinks(titles) {
  return Promise.all(
    titles.sort().map((t) => getLinks(t))
  ).then((links) => {
    // find the most common occurances.
    
    const commonLinks = intersection( links[0], links[1] );
    const countLinksA = countLinkOccurances(links[0]);
    const countLinksB = countLinkOccurances(links[1]);
    const frequentLinks = commonLinks.sort((a,b) => {
      return (
        countLinksA[a] + countLinksB[b]
      ) / 2 > (
        countLinksB[a] + countLinksB[b]
      ) ? -1 : 1;
    });
    return frequentLinks.slice(0, 5).map((title) => ( { title } ) );
  })
}
function moreLike(titles, algorithm) {
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
  let profile;
  let searchQuery;
  let suffix = '';
  switch( algorithm ) {
    case '3':
        return mostLinks( titles );
    case '2':
        suffix = '&cirrusMltMaxQueryTerms=10';
        searchQuery = `morelike%3A${mLlQuery}`;
        profile = 'classic_noboostlinks';
        break;
    case '1':
        searchQuery = `morelike%3A${mLlQuery}`;
        profile = 'popular_inclinks';
        break;
    case '0':
    default:
        searchQuery = `morelike%3A${mLlQuery}`;
        profile = 'classic_noboostlinks';
        break;
  }

  if ( moreLikeCache[mLlQuery] ) {
    return Promise.resolve( moreLikeCache[mLlQuery] );
  }
  return fetch(`https://en.m.wikipedia.org/w/api.php?action=query&formatversion=2&origin=*&format=json&smaxage=86400&maxage=86400&uselang=content&list=search&&srsearch=${searchQuery}&srnamespace=0&srlimit=6&srqiprofile=${profile}${suffix}`)
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
