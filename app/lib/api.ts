// app/lib/api.ts

// 1) 배포 환경 → Render 백엔드 URL 자동 사용
// 2) 로컬 개발 → http://127.0.0.1:8000
// 3) 환경 변수(NEXT_PUBLIC_API_BASE_URL)가 있으면 그걸 우선 사용

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://madde-backend.onrender.com"
    : "http://127.0.0.1:8000");
