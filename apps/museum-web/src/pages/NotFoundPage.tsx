import { Link } from "react-router-dom";
import { useMuseumContext } from "../context";
import { withLang } from "../routing";

export function NotFoundPage() {
  const { locale } = useMuseumContext();
  return (
    <section className="page-shell not-found-page">
      <span>404</span>
      <h1>{locale === "zh-CN" ? "这条路径尚未进入展馆" : "This path is not yet in the museum"}</h1>
      <Link className="button button-primary" to={withLang("/", locale)}>{locale === "zh-CN" ? "返回首页" : "Return home"}</Link>
    </section>
  );
}
