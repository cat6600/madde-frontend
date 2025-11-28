"use client";
import { useState } from "react";
import { Button, Input, Form, Card, message, Radio } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("admin");
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", role);
      formData.append("password", values.password);
      const res = await axios.post(`${API_BASE_URL}/login`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      localStorage.setItem("role", res.data.role);
      message.success("로그인 성공!");
      router.push("/dashboard");
    } catch {
      message.error("아이디 또는 비밀번호가 틀렸습니다 ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#EEF2FF" }}>
      <Card style={{ width: 400, textAlign: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        <h2>회사 통합 관리 시스템</h2>
        <p style={{ color: "gray" }}>Company Management System</p>
        <div style={{ margin: "20px 0" }}>
          <span>권한 선택</span>
          <Radio.Group
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ marginTop: 10, display: "flex", justifyContent: "center" }}
          >
            <Radio.Button value="admin">관리자</Radio.Button>
            <Radio.Button value="viewer">뷰어</Radio.Button>
          </Radio.Group>
        </div>
        <Form onFinish={onFinish}>
          <Form.Item name="password" rules={[{ required: true, message: "비밀번호를 입력하세요" }]}>
            <Input.Password placeholder="비밀번호" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block style={{ background: "#4F46E5" }}>
            로그인
          </Button>
        </Form>
        {role === "viewer" && (
          <p style={{ marginTop: 10, color: "#C27803", background: "#FFF8E1", padding: 6, borderRadius: 4 }}>
            뷰어 권한: 일부 페이지는 열람이 제한됩니다.
          </p>
        )}
      </Card>
    </div>
  );
}
