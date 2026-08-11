import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, TextInput } from "./field";

describe("Field", () => {
  it("connects label, hint, and error text to the form control", () => {
    render(
      <Field label="이메일" hint="로그인에 사용할 주소입니다." error="이메일을 입력하세요.">
        <TextInput />
      </Field>,
    );

    const input = screen.getByLabelText("이메일");
    const hint = screen.getByText("로그인에 사용할 주소입니다.");
    const error = screen.getByText("이메일을 입력하세요.");

    expect(input).toHaveAccessibleName("이메일");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
  });
});
