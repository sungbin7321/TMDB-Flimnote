import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFavorites, saveFavorites } from '../public/js/favorites.js';
import { posterUrl } from '../public/js/api.js';
function memoryStorage(value = null) { return { getItem: () => value, setItem: (_, next) => { value = next; } }; }
test('찜 저장 후 재로딩, 중복 제거, 삭제 유지', () => {
  const storage = memoryStorage(); const movie = { id: 1, title: '영화', vote_average: 8.1, overview: '저장할 필요 없는 상세정보' };
  saveFavorites([movie, movie], storage);
  let loaded = readFavorites(storage); assert.equal(loaded.movies.length, 1); assert.equal(loaded.movies[0].title, '영화');
  assert.equal(loaded.movies[0].overview, undefined);
  saveFavorites([], storage); assert.deepEqual(readFavorites(storage).movies, []);
});
test('손상된 저장소와 접근 차단을 안전하게 처리', () => {
  assert.ok(readFavorites(memoryStorage('{broken')).error);
  assert.ok(readFavorites(memoryStorage('{}')).error);
  assert.deepEqual(readFavorites(memoryStorage('[null, {"id":-1,"title":"x"}]')).movies, []);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.ok(readFavorites(blocked).error); assert.throws(() => saveFavorites([], blocked));
});
test('이미지 경로 검증 및 누락 포스터 처리', () => {
  assert.equal(posterUrl('/abc.jpg'), 'https://image.tmdb.org/t/p/w500/abc.jpg');
  for (const invalid of [null, '', 'https://evil.example/a.jpg', '/../a.jpg']) assert.equal(posterUrl(invalid), null);
});
