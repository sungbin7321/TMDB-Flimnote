import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/server.js';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('검색어 인코딩, 한국어, 페이지, Bearer 인증을 서버에서 적용', async () => {
  let calls = 0;
  await withServer({ token: 'test-secret', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url.origin, 'https://api.themoviedb.org');
    assert.equal(url.pathname, '/3/search/movie');
    assert.equal(url.searchParams.get('query'), '기생충 & 영화');
    assert.equal(url.searchParams.get('language'), 'ko-KR');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('include_adult'), 'false');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return Response.json({ results: [{ id: 1, title: '기생충' }], page: 2, total_pages: 3 });
  } }, async base => {
    const response = await fetch(`${base}/api/movies/search?${new URLSearchParams({ query: '기생충 & 영화', page: '2' })}`);
    assert.equal(response.status, 200);
    const text = await response.text(); assert.ok(!text.includes('test-secret'));
    assert.equal(JSON.parse(text).results[0].title, '기생충');
  });
  assert.equal(calls, 1);
});
test('잘못된 검색어, 페이지, ID는 외부 요청 전에 거부', async () => {
  await withServer({ token: 'test', fetchImpl: () => { throw new Error('호출되면 안 됩니다'); } }, async base => {
    for (const route of ['/search?query=', '/search?query=x&page=0', '/search?query=x&page=501', '/search?query=x&page=1.5', '/search?query=x&page[]=1', '/search?query[]=x', '/0', '/abc']) {
      assert.equal((await fetch(`${base}/api/movies${route}`)).status, 400, route);
    }
  });
});
test('토큰 없이도 화면과 정적 모듈 제공, 민감한 파일 비공개', async () => {
  await withServer({ token: '' }, async base => {
    assert.equal((await fetch(`${base}/api/movies/search?query=x`)).status, 503);
    const page = await fetch(base); assert.equal(page.status, 200);
    assert.ok((await page.text()).includes('필름노트'));
    for (const route of ['/js/app.js', '/js/api.js', '/js/ui.js', '/js/favorites.js', '/css/style.css']) assert.equal((await fetch(base + route)).status, 200);
    for (const route of ['/.env', '/.env.example', '/server/server.js', '/package.json']) assert.equal((await fetch(base + route)).status, 404);
    assert.equal((await fetch(`${base}/api/unknown`)).status, 404);
  });
});
test('상세정보 경로와 한국어 적용', async () => {
  await withServer({ token: 'test', fetchImpl: async url => {
    assert.equal(url.pathname, '/3/movie/157336');
    assert.equal(url.searchParams.get('language'), 'ko-KR');
    return Response.json({ id: 157336, title: '인터스텔라', runtime: 169 });
  } }, async base => {
    const response = await fetch(`${base}/api/movies/157336`);
    assert.equal((await response.json()).runtime, 169);
  });
});
test('TMDB 오류 상태를 한국어 메시지로 변환하고 원문을 숨김', async () => {
  for (const [upstream, expected] of [[401,502], [403,502], [404,404], [429,429], [500,502]]) {
    await withServer({ token: 'test', fetchImpl: async () => new Response('secret upstream detail', { status: upstream }) }, async base => {
      const response = await fetch(`${base}/api/movies/1`);
      assert.equal(response.status, expected);
      const body = await response.json(); assert.ok(body.error); assert.ok(!body.error.includes('secret'));
    });
  }
});
test('타임아웃 및 네트워크 오류 처리', async () => {
  for (const [name, status] of [['TimeoutError',504], ['TypeError',502]]) {
    await withServer({ token: 'test', fetchImpl: async () => { const error = new Error('private'); error.name = name; throw error; } }, async base => {
      assert.equal((await fetch(`${base}/api/movies/1`)).status, status);
    });
  }
});
