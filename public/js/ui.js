import { posterUrl } from './api.js';
// 외부 데이터는 innerHTML 대신 textContent로 넣어 HTML 실행을 방지합니다.
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function poster(movie) {
  const box = element('div', 'poster');
  const placeholder = element('span', 'poster-placeholder', 'FILM NOTE\n포스터 준비 중');
  box.append(placeholder);
  const src = posterUrl(movie.poster_path);
  if (src) {
    const img = element('img');
    img.src = src; img.alt = `${movie.title} 포스터`; img.loading = 'lazy';
    img.addEventListener('error', () => img.remove(), { once: true });
    box.append(img);
  }
  return box;
}
export const rating = movie => Number.isFinite(movie.vote_average) && movie.vote_average > 0 ? `★ ${movie.vote_average.toFixed(1)}` : '평점 없음';
export const releaseDate = movie => movie.release_date || '개봉일 미정';
export function favoriteButton(movie, saved, onToggle) {
  const button = element('button', `favorite-button${saved ? ' saved' : ''}`, saved ? '♥ 찜 해제' : '♡ 찜하기');
  button.setAttribute('aria-label', `${movie.title} ${saved ? '찜 해제' : '찜하기'}`);
  button.setAttribute('aria-pressed', String(saved));
  button.addEventListener('click', () => onToggle(movie));
  return button;
}
export function renderMovies(container, movies, favorites, onDetails, onToggle) {
  container.replaceChildren(...movies.map(movie => {
    const card = element('article', 'movie-card');
    const open = element('button', 'movie-open');
    open.dataset.movieId = movie.id;
    open.setAttribute('aria-label', `${movie.title} 상세정보 보기`);
    open.append(poster(movie), element('h3', '', movie.title));
    open.addEventListener('click', () => onDetails(movie));
    const meta = element('div', 'movie-meta');
    meta.append(element('span', '', releaseDate(movie)), element('span', 'rating', rating(movie)));
    card.append(open, meta, favoriteButton(movie, favorites.some(item => item.id === movie.id), onToggle));
    return card;
  }));
}
export function renderDetail(container, movie, saved, onToggle) {
  const body = element('div', 'detail-layout');
  const text = element('div', 'detail-text');
  const title = element('h2', '', movie.title); title.id = 'detail-title';
  text.append(element('span', 'eyebrow', 'BEHIND THE STORY'), title,
    element('p', 'muted', `${releaseDate(movie)} · ${movie.runtime ? `${movie.runtime}분` : '상영시간 미정'} · ${rating(movie)}`),
    element('p', 'genres', (movie.genres || []).map(genre => genre.name).join(' · ') || '장르 정보 없음'),
    element('p', 'overview', movie.overview || '등록된 한국어 줄거리가 없습니다.'),
    favoriteButton(movie, saved, onToggle));
  body.append(poster(movie), text); container.replaceChildren(body);
}
