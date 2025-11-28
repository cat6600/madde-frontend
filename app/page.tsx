// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // 루트("/")로 접속하면 즉시 로그인 페이지로 이동
  redirect("/login");
}
