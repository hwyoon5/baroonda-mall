const STORE_MAP_FOLDER = "32fa173c12ac4cfb970e682d2d2818b3";

/** 생태계 매장 저장 목록 웹 페이지. PC와 앱이 없는 휴대폰에서 연다. */
export const STORE_MAP_URL = `https://pages.map.naver.com/save-pages/web/detail-list/${STORE_MAP_FOLDER}`;

// 네이버 지도 앱 저장 목록(bookmark/share)을 바로 여는 주소. naver.me·appLink 안내 페이지를 거치지 않는다.
const appQuery = `version=2&id=${STORE_MAP_FOLDER}&appSchemeName=nmap&app=Y&appmarket=N&fallbackUrl=${encodeURIComponent(STORE_MAP_URL)}`;

/** iOS 유니버설 링크·Android 앱 링크(app.map.naver.com/launchApp). 앱이 없으면 네이버가 웹 목록으로 넘긴다. */
export const STORE_MAP_APP_LINK = `https://app.map.naver.com/launchApp/bookmark/share?${appQuery}`;

/** Android 크롬·삼성 인터넷: nmap:// 스킴으로 앱을 바로 열고, 앱이 없으면 웹 목록을 연다. */
export const STORE_MAP_ANDROID_INTENT =
  `intent://bookmark/share?${appQuery}#Intent;scheme=nmap;action=android.intent.action.VIEW;` +
  `category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;` +
  `S.browser_fallback_url=${encodeURIComponent(STORE_MAP_URL)};end`;
