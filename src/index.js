addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  };

  // OPTIONS 요청 처리
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // GET 요청: 모든 점수를 가져와서 페이지네이션 처리
  if (path === "/api/scores" && request.method === "GET") {
    try {
      const password = request.headers.get("X-Admin-Password");
      if (password !== "devscarycat") {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid password" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // 쿼리 파라미터에서 페이지네이션 정보 가져오기
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const perPage = parseInt(url.searchParams.get("per_page") || "10", 10);

      const listResponse = await SCORES.list(); // KV의 모든 키-값을 리스트업
      const allKeys = listResponse.keys;

      let allScores = [];
      const scorePromises = allKeys.map((key) => SCORES.get(key.name, { type: "json" }));
      allScores = await Promise.all(scorePromises); // 모든 점수 데이터를 병렬로 가져옴

      // 점수 내림차순 정렬
      allScores.sort((a, b) => b.score - a.score);

      // 페이지네이션 로직
      const totalScores = allScores.length;
      const totalPages = Math.ceil(totalScores / perPage);
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const paginatedScores = allScores.slice(start, end);

      const responseData = {
        scores: paginatedScores,
        totalPages: totalPages,
        currentPage: page,
        totalCount: totalScores,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      console.error("Failed to read scores:", error);
      return new Response(JSON.stringify({ error: "Failed to read scores" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // POST 요청: 점수를 개별 키로 저장
  if (path === "/api/scores" && request.method === "POST") {
    try {
      const { id, score, timestamp } = await request.json();
      if (!id || typeof score !== "number" || score < 0) {
        return new Response(JSON.stringify({ error: "Invalid score data" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // 고유한 키 생성: score_ID_TIMESTAMP 형태로 저장
      const key = `score_${id}_${timestamp}`;
      await SCORES.put(key, JSON.stringify({ id, score, timestamp }));

      return new Response(JSON.stringify({ success: true, key }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      console.error("Failed to save score:", error);
      return new Response(JSON.stringify({ error: "Failed to save score" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
}
