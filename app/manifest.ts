import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "公益API导航站",
    short_name: "API导航",
    description: "精心收录 AI 大模型 API，涵盖官方原厂与公益中转服务",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5b8def",
    icons: [
      { src: "/favicon.ico", sizes: "256x256", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
