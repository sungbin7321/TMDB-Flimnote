import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env'), quiet: true });

// 의존성을 주입하면 실제 토큰이나 외부 통신 없이 서버를 검증할 수 있습니다.
export function createApp({ token = process.env.TMDB_ACCESS_TOKEN, fetchImpl = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https://image.tmdb.org; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    next();
  });

  async function tmdb(endpoint, params, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!token || token === 'your_tmdb_read_access_token_here') {
      return res.status(503).json({ error: 'TMDB 토큰이 설정되지 않았습니다. README의 실행 안내를 확인해 주세요.' });
    }
    const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.search = new URLSearchParams({ language: 'ko-KR', ...params }).toString();
    try {
      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        const status = response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
        const error = response.status === 404 ? '영화를 찾을 수 없습니다.'
          : response.status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
          : [401, 403].includes(response.status) ? 'TMDB 인증에 실패했습니다. 서버의 토큰 설정을 확인해 주세요.'
          : '영화 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return res.status(status).json({ error });
      }
      return res.json(await response.json());
    } catch (error) {
      // 외부 오류 원문에는 인증 정보가 포함될 수 있어 클라이언트로 전달하지 않습니다.
      const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
      return res.status(timeout ? 504 : 502).json({ error: timeout ? '응답 시간이 초과되었습니다. 다시 시도해 주세요.' : 'TMDB 연결에 실패했습니다. 네트워크를 확인해 주세요.' });
    }
  }

  app.get('/api/movies/search', (req, res) => {
    if (Object.keys(req.query).some(key => !['query', 'page'].includes(key))) return res.status(400).json({ error: '지원하지 않는 검색 파라미터입니다.' });
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const rawPage = req.query.page ?? '1';
    const page = typeof rawPage === 'string' && /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
    if (!query || query.length > 100) return res.status(400).json({ error: '검색어를 1~100자로 입력해 주세요.' });
    if (!Number.isInteger(page) || page < 1 || page > 500) return res.status(400).json({ error: '페이지는 1~500 범위의 정수여야 합니다.' });
    return tmdb('/search/movie', { query, page: String(page), include_adult: 'false' }, res);
  });
  app.get('/api/movies/:id', (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return res.status(400).json({ error: '올바른 영화 ID가 필요합니다.' });
    return tmdb(`/movie/${req.params.id}`, {}, res);
  });
  app.use('/api', (req, res) => res.status(404).json({ error: '지원하지 않는 API 경로입니다.' }));
  // 프로젝트 전체가 아닌 public만 공개하므로 .env와 서버 코드는 제공되지 않습니다.
  app.use(express.static(path.join(root, 'public'), { dotfiles: 'deny' }));
  app.use((req, res) => res.status(404).send('페이지를 찾을 수 없습니다.'));
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535여야 합니다.');
  createApp().listen(port, () => console.log(`영화 서비스 실행: http://localhost:${port}`));
}
