"use client";

export default function TestPage() {
  console.log("TestPage rendered");
  
  return (
    <div style={{ padding: "50px", background: "#050816", color: "white", minHeight: "100vh" }}>
      <h1>Simple Test Page</h1>
      <p>If this page keeps reloading/blinking, the issue is NOT with framer-motion or AuthContext.</p>
      <p>Check your browser console to see how many times "TestPage rendered" appears.</p>
    </div>
  );
}
