// Test-only replacement for Next's router context inside the isolated component harness.
import { createElement, type AnchorHTMLAttributes } from "react";
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return createElement("a", props);
}
