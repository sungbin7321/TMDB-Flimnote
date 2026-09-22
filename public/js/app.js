import { searchMovies, getMovie } from './api.js';
import { readFavorites, saveFavorites, STORAGE_KEY } from './favorites.js';
import { element, renderMovies, renderDetail } from './ui.js';

const $ = id => document.getElementById(id);
const initial = readFavorites();
const state = { view: 'search', query: '', page: 1, pages: 0, total: 0, movies: [], favorites: initial.movies, loading: false, error: '', detail: null };
let searchController, detailController, detailOpenerId;
function notify(message) { $('notice').textContent = message; $('notice').hidden = !message; }
function render() {
  const favoritesView = state.view === 'favorites';
  const movies = favoritesView ? state.favorites : state.movies;
  $('favorite-count').textContent = state.favorites.length;
  for (const name of ['search', 'favorites']) {
    $(`${name}-view`).classList.toggle('active', name === state.view);
    $(`${name}-view`).setAttribute('aria-pressed', String(name === state.view));
  }
  $('section-title').textContent = favoritesView ? '나의 찜 목록' : state.query ? `“${state.query}” 검색 결과` : '영화 찾기';
  $('section-kicker').textContent = favoritesView ? 'YOUR PERSONAL COLLECTION' : 'EXPLORE THE STORIES';
  $('result-count').textContent = favoritesView ? `${movies.length}편의 이야기` : state.query && !state.loading && !state.error ? `${state.total.toLocaleString('ko-KR')}편의 영화` : '';
  const busy = !favoritesView && state.loading;
  const error = !favoritesView && state.error;
  $('movies').setAttribute('aria-busy', String(busy));
  renderMovies($('movies'), busy || error ? [] : movies, state.favorites, openDetail, toggleFavorite);
  let message = busy ? '영화를 찾고 있어요…' : error;
  if (!message && !movies.length) message = favoritesView ? '아직 찜한 영화가 없어요. 마음에 드는 영화의 ♡ 찜하기를 눌러 보세요.' : state.query ? '검색 결과가 없어요. 다른 제목으로 찾아보세요.' : '어떤 이야기가 기다리고 있을까요? 영화 제목을 검색해 보세요.';
  $('status').textContent = message || ''; $('status').hidden = !message;
  $('status').classList.toggle('loading', busy);
  $('retry').hidden = !error;
  $('pagination').hidden = favoritesView || busy || !!error || state.pages <= 1;
  $('page-label').textContent = `${state.page} / ${state.pages}`;
  $('prev').disabled = state.page <= 1; $('next').disabled = state.page >= state.pages;
}
async function search(query, page = 1) {
  query = query.trim();
  if (!query) { $('query').focus(); return; }
  searchController?.abort();
  const controller = new AbortController(); searchController = controller;
  Object.assign(state, { view: 'search', query, page, loading: true, error: '' });
  render();
  try {
    const data = await searchMovies(query, page, controller.signal);
    if (controller.signal.aborted) return;
    Object.assign(state, { movies: data.results || [], pages: Math.min(data.total_pages || 0, 500), total: data.total_results || 0 });
  } catch (error) {
    if (controller.signal.aborted) return;
    state.error = error instanceof TypeError ? '서버에 연결하지 못했습니다. 서버 실행 상태와 네트워크를 확인해 주세요.' : error.message;
  } finally {
    if (!controller.signal.aborted) { state.loading = false; render(); }
  }
}
function toggleFavorite(movie) {
  // 클릭 직전에 다시 읽어 다른 탭에서 바뀐 목록도 최대한 반영합니다.
  const current = readFavorites();
  if (current.error) { notify(current.error); return; }
  const exists = current.movies.some(item => item.id === movie.id);
  const next = exists ? current.movies.filter(item => item.id !== movie.id) : [movie, ...current.movies];
  try { saveFavorites(next); } catch { notify('찜 목록을 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.'); return; }
  state.favorites = next;
  notify(exists ? '찜 목록에서 삭제했습니다.' : '찜 목록에 추가했습니다. 이 브라우저에 저장됩니다.');
  const active = document.activeElement;
  const cardIndex = [...$('movies').children].findIndex(card => card.contains(active));
  const inDialog = $('detail-dialog').contains(active);
  render();
  if (state.detail && $('detail-dialog').open) {
    renderDetail($('detail-content'), state.detail, next.some(item => item.id === state.detail.id), toggleFavorite);
    if (inDialog) $('detail-content').querySelector('.favorite-button')?.focus();
  }
  if (cardIndex >= 0) {
    const cards = $('movies').children;
    cards[Math.min(cardIndex, cards.length - 1)]?.querySelector('.favorite-button')?.focus();
    if (!cards.length) $('favorites-view').focus();
  }
}
async function openDetail(movie) {
  detailOpenerId = movie.id;
  detailController?.abort();
  const controller = new AbortController(); detailController = controller;
  state.detail = null;
  const heading = element('h2', '', movie.title); heading.id = 'detail-title';
  const loading = element('p', 'muted', '상세정보를 불러오는 중…'); loading.setAttribute('role', 'status');
  $('detail-content').replaceChildren(heading, loading);
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
  try {
    const detail = await getMovie(movie.id, controller.signal);
    if (controller.signal.aborted) return;
    state.detail = detail;
    renderDetail($('detail-content'), detail, state.favorites.some(item => item.id === detail.id), toggleFavorite);
  } catch (error) {
    if (controller.signal.aborted) return;
    const message = element('p', 'notice', error instanceof TypeError ? '서버에 연결하지 못했습니다.' : error.message);
    message.setAttribute('role', 'alert');
    const retry = element('button', 'secondary', '다시 시도'); retry.addEventListener('click', () => openDetail(movie));
    $('detail-content').replaceChildren(heading, message, retry);
  }
}
$('search-form').addEventListener('submit', event => { event.preventDefault(); search($('query').value); });
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => { $('query').value = button.dataset.query; search(button.dataset.query); }));
$('search-view').addEventListener('click', () => { state.view = 'search'; render(); });
$('favorites-view').addEventListener('click', () => { state.view = 'favorites'; render(); });
$('prev').addEventListener('click', () => search(state.query, state.page - 1));
$('next').addEventListener('click', () => search(state.query, state.page + 1));
$('retry').addEventListener('click', () => search(state.query, state.page));
$('close-dialog').addEventListener('click', () => $('detail-dialog').close());
$('detail-dialog').addEventListener('click', event => {
  const bounds = $('detail-dialog').getBoundingClientRect();
  if (event.target === $('detail-dialog') && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) $('detail-dialog').close();
});
$('detail-dialog').addEventListener('close', () => {
  detailController?.abort(); state.detail = null;
  // 찜 변경으로 카드 DOM이 교체돼도 모달을 열었던 영화로 포커스를 돌립니다.
  const opener = [...$('movies').querySelectorAll('.movie-open')].find(button => button.dataset.movieId === String(detailOpenerId));
  (opener || $(`${state.view}-view`)).focus();
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const saved = readFavorites(); state.favorites = saved.movies; notify(saved.error); render();
  if (state.detail && $('detail-dialog').open) renderDetail($('detail-content'), state.detail, state.favorites.some(item => item.id === state.detail.id), toggleFavorite);
});
notify(initial.error); render();
