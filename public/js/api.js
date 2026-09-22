// 브라우저는 우리 서버만 호출합니다. TMDB 토큰을 이 파일에 넣지 마세요.
async function request(path, signal) {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  let data;
  try { data = await response.json(); } catch { throw new Error('서버 응답을 확인할 수 없습니다. 다시 시도해 주세요.'); }
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data;
}
export const searchMovies = (query, page, signal) => request(`/api/movies/search?${new URLSearchParams({ query, page })}`, signal);
export const getMovie = (id, signal) => request(`/api/movies/${id}`, signal);
// 공식 이미지 URL: base URL + size + poster_path. 외부 임의 URL은 허용하지 않습니다.
export function posterUrl(path) {
  return typeof path === 'string' && /^\/[a-zA-Z0-9_.-]+$/.test(path) ? `https://image.tmdb.org/t/p/w500${path}` : null;
}
