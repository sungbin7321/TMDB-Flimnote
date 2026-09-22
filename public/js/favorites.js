export const STORAGE_KEY = 'film-note:favorites:v1';
function normalize(movie) {
  if (!movie || !Number.isSafeInteger(movie.id) || movie.id <= 0 || typeof movie.title !== 'string') return null;
  return { id: movie.id, title: movie.title, poster_path: typeof movie.poster_path === 'string' ? movie.poster_path : null, release_date: typeof movie.release_date === 'string' ? movie.release_date : '', vote_average: Number.isFinite(movie.vote_average) ? movie.vote_average : 0 };
}
export function readFavorites(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) throw new Error('Invalid data');
    return { movies: [...new Map(raw.map(normalize).filter(Boolean).map(movie => [movie.id, movie])).values()], error: '' };
  } catch {
    return { movies: [], error: '저장된 찜 목록을 읽지 못했습니다. 브라우저의 저장소 설정을 확인해 주세요.' };
  }
}
export function saveFavorites(movies, storage = localStorage) {
  // 저장이 실패하면 호출자에게 알려 UI가 성공한 것처럼 보이지 않도록 합니다.
  storage.setItem(STORAGE_KEY, JSON.stringify(movies.map(normalize).filter(Boolean)));
}
