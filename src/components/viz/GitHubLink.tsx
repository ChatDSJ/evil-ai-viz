import { useEffect, useState } from "react";

const GITHUB_REPO_URL = "https://github.com/ChatDSJ/evil-ai-viz";

export function GitHubLink() {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);

  // Auto-hide after 5 seconds, reappear on mouse move
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 5000);
    };

    show();
    window.addEventListener("mousemove", show);
    return () => {
      window.removeEventListener("mousemove", show);
      clearTimeout(timer);
    };
  }, []);

  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        bottom: "36px",
        left: "12px",
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.7)",
        border: `1px solid rgba(0, 255, 65, ${hovered ? 0.8 : 0.4})`,
        borderRadius: "4px",
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: hovered ? 1 : visible ? 0.8 : 0,
        transition: "opacity 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: hovered
          ? "0 0 15px rgba(0, 255, 65, 0.3)"
          : "0 0 10px rgba(0, 255, 65, 0.15)",
        textDecoration: "none",
      }}
    >
      {/* GitHub icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="#00ff41"
        style={{ flexShrink: 0 }}
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <span
        style={{
          color: "#00ff41",
          fontSize: "13px",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        SOURCE CODE
      </span>
    </a>
  );
}
