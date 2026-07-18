import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

import AdminLoginPage from "@/app/login/page";

describe("管理员登录页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("登录请求异常时恢复按钮并显示通用服务错误", async () => {
    mocks.signIn.mockRejectedValueOnce(new Error("network unavailable"));
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText("管理员密码"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect((screen.getByRole("button", { name: "正在验证" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("登录服务暂不可用，请稍后重试");
    });
    expect((screen.getByRole("button", { name: "登录" }) as HTMLButtonElement).disabled).toBe(
      false
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("登录返回空结果时不进入管理后台", async () => {
    mocks.signIn.mockResolvedValueOnce(undefined);
    render(<AdminLoginPage />);

    fireEvent.change(screen.getByLabelText("管理员密码"), {
      target: { value: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("登录服务暂不可用，请稍后重试");
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
